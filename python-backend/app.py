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
# Update the CORS configuration to allow all routes and methods
CORS(app, resources={
    r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "X-Paddle-Signature", "Authorization"]
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
        
        # Try to find and update the user with this customer ID
        try:
            # Get customer details from Paddle API
            customer = paddle.customers.get(customer_id)
            email = customer.email
            
            # First try to find user by email in our database
            user_result = supabase.table('users').select('*').eq('email', email).execute()
            
            if hasattr(user_result, 'data') and user_result.data and len(user_result.data) > 0:
                user = user_result.data[0]
                clerk_user_id = user.get('clerk_user_id')
                
                # Update user with Paddle customer ID and subscription status
                supabase.table('users').update({
                    'paddle_customer_id': customer_id,
                    'has_subscription': True,
                    'email': email,  # Ensure email is set
                    'updated_at': datetime.utcnow().isoformat()
                }).eq('clerk_user_id', clerk_user_id).execute()
                
                logger.info(f"Updated user {clerk_user_id} with customer ID {customer_id} and active subscription")
            else:
                # If no user found by email, try to find the most recently active user
                # This is a fallback for when the email doesn't match
                recent_users = supabase.table('users').select('*').order('updated_at', desc=True).limit(5).execute()
                
                if hasattr(recent_users, 'data') and recent_users.data and len(recent_users.data) > 0:
                    # Update the most recently active user
                    recent_user = recent_users.data[0]
                    clerk_user_id = recent_user.get('clerk_user_id')
                    
                    supabase.table('users').update({
                        'paddle_customer_id': customer_id,
                        'has_subscription': True,
                        'email': email,  # Set the email from Paddle
                        'updated_at': datetime.utcnow().isoformat()
                    }).eq('clerk_user_id', clerk_user_id).execute()
                    
                    logger.info(f"Linked customer {customer_id} to most recent user {clerk_user_id}")
                else:
                    logger.error(f"No users found to link with customer {customer_id}")
        except Exception as e:
            logger.error(f"Error linking customer to user: {str(e)}")
        
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
            customer = paddle.customers.get(customer_id)
            
            # Get customer email from Paddle
            customer_email = customer.email if customer else None
            
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
            
            # Update the user's subscription status
            try:
                # First try to find user by email
                user_result = None
                if customer_email:
                    user_result = supabase.table('users').select('*').eq('email', customer_email).execute()
                
                # If no user found by email, try to find by customer_id (in case it was set earlier)
                if not user_result or not user_result.data:
                    user_result = supabase.table('users').select('*').eq('paddle_customer_id', customer_id).execute()
                
                if hasattr(user_result, 'data') and user_result.data and len(user_result.data) > 0:
                    user = user_result.data[0]
                    clerk_user_id = user.get('clerk_user_id')
                    
                    # Update user with customer ID and subscription status
                    supabase.table('users').update({
                        'paddle_customer_id': customer_id,
                        'has_subscription': True,
                        'email': customer_email or user.get('email'),
                        'updated_at': datetime.utcnow().isoformat()
                    }).eq('clerk_user_id', clerk_user_id).execute()
                    
                    logger.info(f"Updated user {clerk_user_id} with customer ID {customer_id} and active subscription")
                else:
                    # If no user found by email or customer_id, try to find the most recently active user
                    recent_users = supabase.table('users').select('*').order('updated_at', desc=True).limit(5).execute()
                    
                    if hasattr(recent_users, 'data') and recent_users.data and len(recent_users.data) > 0:
                        # Update the most recently active user
                        recent_user = recent_users.data[0]
                        clerk_user_id = recent_user.get('clerk_user_id')
                        
                        supabase.table('users').update({
                            'paddle_customer_id': customer_id,
                            'has_subscription': True,
                            'email': customer_email or recent_user.get('email'),
                            'updated_at': datetime.utcnow().isoformat()
                        }).eq('clerk_user_id', clerk_user_id).execute()
                        
                        logger.info(f"Linked customer {customer_id} to most recent user {clerk_user_id}")
                    else:
                        logger.error(f"No users found to link with customer {customer_id}")
            except Exception as user_error:
                logger.error(f"Error updating user subscription status: {str(user_error)}")
            
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

@app.route('/api/users/register', methods=['POST'])
def register_user():
    try:
        data = request.json
        user_id = data.get('user_id')
        email = data.get('email')
        
        logger.info(f"Registering user: {user_id}, email: {email}")
        
        if not user_id:
            logger.error("No user ID provided in registration")
            return jsonify({"error": "User ID is required"}), 400
            
        # Check if user already exists
        existing_user = supabase.table('users').select('*').eq('clerk_user_id', user_id).execute()
        
        if hasattr(existing_user, 'data') and existing_user.data and len(existing_user.data) > 0:
            # User exists, update their information if needed
            user = existing_user.data[0]
            logger.info(f"User {user_id} already exists, checking for updates")
            
            # Only update email if provided and different
            if email and email != user.get('email'):
                update_result = supabase.table('users').update({
                    'email': email,
                    'updated_at': datetime.now().isoformat()
                }).eq('clerk_user_id', user_id).execute()
                
                logger.info(f"Updated email for existing user {user_id}")
            
            # Always re-check Paddle subscription status if paddle_customer_id is present
            paddle_customer_id = user.get('paddle_customer_id')
            has_subscription = user.get('has_subscription', False)
            if paddle_customer_id:
                try:
                    subscription_result = supabase.table('subscriptions')\
                        .select('*')\
                        .eq('customer_id', paddle_customer_id)\
                        .eq('status', 'active')\
                        .execute()
                    if hasattr(subscription_result, 'data') and subscription_result.data:
                        # Update the user's subscription status if needed
                        if not has_subscription:
                            supabase.table('users')\
                                .update({'has_subscription': True})\
                                .eq('clerk_user_id', user_id)\
                                .execute()
                        has_subscription = True
                except Exception as sub_error:
                    logger.error(f"Error checking subscriptions table (register): {str(sub_error)}")
            
            return jsonify({
                "success": True,
                "message": "User already registered",
                "has_subscription": has_subscription
            })
        
        # User doesn't exist, create new user
        logger.info(f"Creating new user: {user_id}")
        user_data = {
            'clerk_user_id': user_id,
            'email': email,
            'has_subscription': False,
            'created_at': datetime.now().isoformat()
        }
        
        result = supabase.table('users').insert(user_data).execute()
        
        if hasattr(result, 'data') and result.data:
            logger.info(f"User {user_id} registered successfully")
            return jsonify({
                "success": True,
                "message": "User registered successfully",
                "has_subscription": False
            })
        else:
            logger.error(f"Failed to register user: {result}")
            return jsonify({"error": "Failed to register user"}), 500
            
    except Exception as e:
        logger.error(f"Error registering user: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/check-subscription', methods=['GET'])
def check_subscription():
    try:
        # Get the user ID from the request
        user_id = request.args.get('user_id')
        
        if not user_id:
            logger.error("No user ID provided in subscription check")
            return jsonify({"error": "User ID is required", "has_active_subscription": False}), 400
        
        logger.info(f"Checking subscription for user: {user_id}")
        
        # First, check if the user exists in our database
        try:
            user_result = supabase.table('users').select('*').eq('clerk_user_id', user_id).execute()
            
            # If user doesn't exist, register them with no subscription
            if not hasattr(user_result, 'data') or not user_result.data:
                logger.info(f"User {user_id} not found in database, registering")
                user_data = {
                    'clerk_user_id': user_id,
                    'has_subscription': False,
                    'created_at': datetime.now().isoformat()
                }
                supabase.table('users').insert(user_data).execute()
                return jsonify({"has_active_subscription": False, "subscriptions": []}), 200
            
            user = user_result.data[0]
            logger.info(f"Found user: {user}")
            
            # If the user has a Paddle customer ID, check their subscription status
            paddle_customer_id = user.get('paddle_customer_id')
            if paddle_customer_id:
                try:
                    # First check Paddle API directly
                    try:
                        customer = paddle.customers.get(paddle_customer_id)
                        if customer:
                            # Get all subscriptions for this customer
                            subscriptions = paddle.subscriptions.list({"customer_id": paddle_customer_id})
                            active_subs = [sub for sub in subscriptions.data if sub.status == 'active']
                            
                            if active_subs:
                                # Update the user's subscription status
                                supabase.table('users').update({
                                    'has_subscription': True,
                                    'updated_at': datetime.utcnow().isoformat()
                                }).eq('clerk_user_id', user_id).execute()
                                
                                logger.info(f"User {user_id} has active Paddle subscriptions")
                                return jsonify({
                                    "has_active_subscription": True,
                                    "subscriptions": [s.id for s in active_subs]
                                }), 200
                    except Exception as paddle_error:
                        logger.error(f"Error checking Paddle API: {str(paddle_error)}")
                    
                    # Fallback to checking Supabase
                    subscription_result = supabase.table('subscriptions')\
                        .select('*')\
                        .eq('customer_id', paddle_customer_id)\
                        .eq('status', 'active')\
                        .execute()
                    
                    if hasattr(subscription_result, 'data') and subscription_result.data:
                        # Update the user's subscription status
                        supabase.table('users').update({
                            'has_subscription': True,
                            'updated_at': datetime.utcnow().isoformat()
                        }).eq('clerk_user_id', user_id).execute()
                        
                        logger.info(f"User {user_id} has active subscriptions in Supabase")
                        return jsonify({
                            "has_active_subscription": True,
                            "subscriptions": subscription_result.data
                        }), 200
                except Exception as sub_error:
                    logger.error(f"Error checking subscriptions: {str(sub_error)}")
            
            # If we get here, ensure subscription is marked as false
            if user.get('has_subscription'):
                supabase.table('users').update({
                    'has_subscription': False,
                    'updated_at': datetime.utcnow().isoformat()
                }).eq('clerk_user_id', user_id).execute()
            
            logger.info(f"User {user_id} has no active subscriptions")
            return jsonify({
                "has_active_subscription": False,
                "subscriptions": []
            }), 200
            
        except Exception as db_error:
            logger.error(f"Database error during subscription check: {str(db_error)}")
            return jsonify({
                "has_active_subscription": False,
                "subscriptions": [],
                "error_details": "Database connection error"
            }), 200
            
    except Exception as e:
        logger.error(f"Error checking subscription: {str(e)}")
        return jsonify({
            "has_active_subscription": False,
            "subscriptions": [],
            "error_details": str(e)
        }), 500
        # Return a 200 response with error details instead of 500
        # This prevents the frontend from breaking
        return jsonify({
            "has_active_subscription": False,
            "subscriptions": [],
            "error": str(e)
        }), 200

if __name__ == '__main__':
    port = int(getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)