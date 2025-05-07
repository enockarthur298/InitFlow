from flask import Flask, request, jsonify
from os import getenv
from dotenv import load_dotenv
import json
import logging
from paddle_billing import Client, Environment, Options
from paddle_billing.Notifications import Secret, Verifier
from flask_cors import CORS  # Add this import
from supabase import create_client, Client as SupabaseClient
from datetime import datetime

# Load environment variables
load_dotenv()

# Initialize Supabase client with service role key if available
supabase_url = getenv('SUPABASE_URL')
supabase_key = getenv('SUPABASE_SERVICE_ROLE_KEY', getenv('SUPABASE_KEY'))
supabase = create_client(supabase_url, supabase_key)

app = Flask(__name__)
# Enable CORS for all routes
CORS(app, resources={
    r"/api/*": {
        "origins": "*",
        "methods": ["POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "X-Paddle-Signature"]
    }
})

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Paddle client using the official approach
paddle_env = getenv('PADDLE_ENVIRONMENT', 'sandbox')
paddle = Client(
    getenv('PADDLE_SECRET_API_KEY'),
    options=Options(Environment.SANDBOX if paddle_env == 'sandbox' else Environment.PRODUCTION)
)

@app.route('/api/paddle/webhook', methods=['POST', 'OPTIONS'])  # Add OPTIONS method
def paddle_webhook():
    # Handle preflight requests
    if request.method == 'OPTIONS':
        return jsonify({"status": "ok"}), 200
        
    try:
        # Get the raw request body
        payload = request.data.decode('utf-8')
        
        # Log headers and payload for debugging
        logger.info(f"Received headers: {dict(request.headers)}")
        logger.info(f"Received payload: {payload}")
        
        # Verify webhook signature using the official Verifier
        webhook_secret = getenv('PADDLE_WEBHOOK_SECRET')
        integrity_check = Verifier().verify(request, Secret(webhook_secret))
        
        if not integrity_check:
            logger.error("Invalid webhook signature")
            return jsonify({"error": "Invalid signature"}), 401
        
        # Parse the payload
        data = json.loads(payload)
        
        # Process the webhook event
        event_type = data.get('event_type')
        logger.info(f"Received Paddle webhook: {event_type}")
        
        # Handle different subscription events
        if event_type == 'subscription.created':
            handle_subscription_created(data)
        elif event_type == 'subscription.updated':
            handle_subscription_updated(data)
        elif event_type == 'subscription.canceled':
            handle_subscription_canceled(data)
        elif event_type == 'subscription.renewed':
            handle_subscription_renewed(data)
        elif event_type == 'subscription.activated':
            handle_subscription_activated(data)
        elif event_type == 'transaction.created':
            handle_transaction_created(data)
        else:
            logger.info(f"Unhandled event type: {event_type}")
        
        return jsonify({"status": "success"}), 200
    
    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}")
        return jsonify({"error": str(e)}), 500

def handle_subscription_created(data):
    """
    Handle subscription.created event
    """
    try:
        subscription_data = data.get('data', {})
        subscription_id = subscription_data.get('id')
        customer_id = subscription_data.get('customer_id')
        status = subscription_data.get('status')
        
        logger.info(f"New subscription created: {subscription_id} for customer {customer_id} with status {status}")
        
        # Get important details directly from the webhook payload
        items = subscription_data.get('items', [])
        next_billing = subscription_data.get('next_billed_at')
        currency = subscription_data.get('currency_code')
        
        logger.info(f"Subscription details: {len(items)} items, next billing at {next_billing}, currency: {currency}")
        
        # Prepare data for Supabase
        subscription_record = {
            'id': subscription_id,
            'customer_id': customer_id,
            'status': status,
            'next_billing_date': next_billing,
            'currency': currency,
            'created_at': subscription_data.get('created_at'),
            'updated_at': subscription_data.get('updated_at'),
            'items_count': len(items),
            'raw_data': json.dumps(subscription_data)  # Store the full payload for reference
        }
        
        # Insert into Supabase
        result = supabase.table('subscriptions').insert(subscription_record).execute()
        
        if hasattr(result, 'data') and result.data:
            logger.info(f"Subscription {subscription_id} saved to Supabase")
        else:
            logger.error(f"Failed to save subscription to Supabase: {result}")
            
        # Store subscription items in a separate table
        for item in items:
            item_record = {
                'subscription_id': subscription_id,
                'price_id': item.get('price', {}).get('id'),
                'product_id': item.get('product', {}).get('id'),
                'product_name': item.get('product', {}).get('name'),
                'quantity': item.get('quantity'),
                'status': item.get('status'),
                'next_billed_at': item.get('next_billed_at'),
                'raw_data': json.dumps(item)
            }
            
            item_result = supabase.table('subscription_items').insert(item_record).execute()
            if hasattr(item_result, 'data') and item_result.data:
                logger.info(f"Subscription item for {subscription_id} saved to Supabase")
            else:
                logger.error(f"Failed to save subscription item to Supabase: {item_result}")
        
    except Exception as e:
        logger.error(f"Error handling subscription.created: {str(e)}")

def handle_subscription_updated(data):
    """
    Handle subscription.updated event
    """
    try:
        subscription_data = data.get('data', {})
        subscription_id = subscription_data.get('id')
        status = subscription_data.get('status')
        
        logger.info(f"Subscription updated: {subscription_id} with new status {status}")
        
        # Prepare update data
        update_data = {
            'status': status,
            'updated_at': datetime.utcnow().isoformat(),
            'raw_data': json.dumps(subscription_data)
        }
        
        # Update in Supabase
        result = supabase.table('subscriptions').update(update_data).eq('id', subscription_id).execute()
        
        if hasattr(result, 'data') and result.data:
            logger.info(f"Subscription {subscription_id} updated in Supabase")
        else:
            logger.error(f"Failed to update subscription in Supabase: {result}")
        
    except Exception as e:
        logger.error(f"Error handling subscription.updated: {str(e)}")

def handle_subscription_canceled(data):
    """
    Handle subscription.canceled event
    """
    try:
        subscription_data = data.get('data', {})
        subscription_id = subscription_data.get('id')
        canceled_at = subscription_data.get('canceled_at')
        
        logger.info(f"Subscription canceled: {subscription_id}")
        
        # Prepare update data
        update_data = {
            'status': 'canceled',
            'canceled_at': canceled_at,
            'updated_at': datetime.utcnow().isoformat(),
            'is_active': False,
            'raw_data': json.dumps(subscription_data)
        }
        
        # Update in Supabase
        result = supabase.table('subscriptions').update(update_data).eq('id', subscription_id).execute()
        
        if hasattr(result, 'data') and result.data:
            logger.info(f"Subscription {subscription_id} marked as canceled in Supabase")
        else:
            logger.error(f"Failed to update canceled subscription in Supabase: {result}")
        
    except Exception as e:
        logger.error(f"Error handling subscription.canceled: {str(e)}")

def handle_subscription_renewed(data):
    """
    Handle subscription.renewed event
    """
    try:
        subscription_data = data.get('data', {})
        subscription_id = subscription_data.get('id')
        next_billed_at = subscription_data.get('next_billed_at')
        
        logger.info(f"Subscription renewed: {subscription_id}, next billing at {next_billed_at}")
        
        # Update subscription in database
        update_data = {
            'next_billing_date': next_billed_at,
            'updated_at': datetime.utcnow().isoformat(),
            'raw_data': json.dumps(subscription_data)
        }
        
        # Update in Supabase
        result = supabase.table('subscriptions').update(update_data).eq('id', subscription_id).execute()
        
        if hasattr(result, 'data') and result.data:
            logger.info(f"Subscription {subscription_id} renewal updated in Supabase")
        else:
            logger.error(f"Failed to update renewed subscription in Supabase: {result}")
        
    except Exception as e:
        logger.error(f"Error handling subscription.renewed: {str(e)}")

def handle_subscription_activated(data):
    """
    Handle subscription.activated event
    This event occurs when a subscription becomes active after payment
    """
    try:
        subscription_data = data.get('data', {})
        subscription_id = subscription_data.get('id')
        customer_id = subscription_data.get('customer_id')
        
        logger.info(f"Subscription activated: {subscription_id} for customer {customer_id}")
        
        try:
            # Get full subscription details from Paddle API
            subscription = paddle.subscriptions.get(subscription_id)
            
            # Important details to track
            status = subscription.status
            current_billing_period = {
                'starts_at': subscription.current_billing_period.starts_at,
                'ends_at': subscription.current_billing_period.ends_at
            }
            
            logger.info(f"Subscription activated with billing period: {current_billing_period}")
            
            # Update subscription in database
            update_data = {
                'status': status,
                'is_active': True,
                'updated_at': datetime.utcnow().isoformat(),
                'raw_data': json.dumps(subscription_data)
            }
            
            # Update in Supabase
            result = supabase.table('subscriptions').update(update_data).eq('id', subscription_id).execute()
            
            if hasattr(result, 'data') and result.data:
                logger.info(f"Subscription {subscription_id} activated in Supabase")
            else:
                logger.error(f"Failed to update activated subscription in Supabase: {result}")
            
        except Exception as api_error:
            logger.error(f"Error retrieving subscription details: {str(api_error)}")
        
    except Exception as e:
        logger.error(f"Error handling subscription.activated: {str(e)}")

def handle_transaction_created(data):
    """
    Handle transaction.created event
    """
    try:
        transaction_data = data.get('data', {})
        transaction_id = transaction_data.get('id')
        subscription_id = transaction_data.get('subscription_id')
        status = transaction_data.get('status')
        
        # Get totals if available
        details = transaction_data.get('details', {})
        totals = details.get('totals', {})
        total_amount = totals.get('total')
        currency_code = transaction_data.get('currency_code')
        
        logger.info(f"Transaction created: {transaction_id} for subscription {subscription_id} with status {status}")
        
        # Prepare transaction record
        transaction_record = {
            'id': transaction_id,
            'subscription_id': subscription_id,  # This might be None for one-time purchases
            'status': status,
            'amount': total_amount,
            'currency': currency_code,
            'created_at': transaction_data.get('created_at'),
            'updated_at': transaction_data.get('updated_at'),
            'raw_data': json.dumps(transaction_data)
        }
        
        # Insert into Supabase
        result = supabase.table('transactions').insert(transaction_record).execute()
        
        if hasattr(result, 'data') and result.data:
            logger.info(f"Transaction {transaction_id} saved to Supabase")
        else:
            logger.error(f"Failed to save transaction to Supabase: {result}")
        
    except Exception as e:
        logger.error(f"Error handling transaction.created: {str(e)}")

# Example of listing products using the Paddle SDK
@app.route('/api/products', methods=['GET'])
def list_products():
    try:
        products_list = []
        
        # Using the iterator pattern from the docs
        for product in paddle.products.list():
            products_list.append({
                "id": product.id,
                "name": product.name,
                "status": product.status
            })
            
        return jsonify({"products": products_list}), 200
    except Exception as e:
        logger.error(f"Error listing products: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Example of getting subscription details
@app.route('/api/subscriptions/<subscription_id>', methods=['GET'])
def get_subscription(subscription_id):
    try:
        subscription = paddle.subscriptions.get(subscription_id)
        
        return jsonify({
            "id": subscription.id,
            "status": subscription.status,
            "customer_id": subscription.customer_id,
            "next_billed_at": subscription.next_billed_at,
            "created_at": subscription.created_at
        }), 200
    except Exception as e:
        logger.error(f"Error getting subscription: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/customer/<customer_id>/subscription', methods=['GET'])
def get_customer_subscription(customer_id):
    try:
        # Query Supabase for active subscriptions for this customer
        result = supabase.table('subscriptions')\
            .select('*')\
            .eq('customer_id', customer_id)\
            .eq('status', 'active')\
            .execute()
        
        if hasattr(result, 'data') and result.data:
            subscriptions = result.data
            return jsonify({
                "has_active_subscription": True,
                "subscriptions": subscriptions
            }), 200
        
        return jsonify({
            "has_active_subscription": False,
            "subscriptions": []
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting customer subscription: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)