import { json, type LoaderFunctionArgs } from '@remix-run/cloudflare';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const userId = url.searchParams.get('user_id');
  
  if (!userId) {
    return json({ error: "User ID is required", has_active_subscription: false }, { status: 400 });
  }
  
  try {
    // Forward the request to your Python backend
    const pythonBackendUrl = process.env.PYTHON_BACKEND_URL || 'http://localhost:5000';
    
    try {
      const response = await fetch(`${pythonBackendUrl}/api/check-subscription?user_id=${userId}`, {
        // Add timeout to prevent hanging requests
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      if (!response.ok) {
        console.error(`Subscription check failed: ${response.statusText}`);
        // Return a successful response with has_active_subscription: false
        return json({ 
          error: `Subscription check failed: ${response.statusText}`,
          has_active_subscription: false,
          subscriptions: []
        }, { status: 200 });
      }
      
      const data = await response.json();
      return json(data);
    } catch (fetchError) {
      console.error('Network error checking subscription:', fetchError);
      // Return a successful response with has_active_subscription: false
      return json({
        error: "Network error checking subscription",
        has_active_subscription: false,
        subscriptions: []
      }, { status: 200 });
    }
  } catch (error) {
    console.error('Error checking subscription:', error);
    
    // Always return a successful response with has_active_subscription: false
    return json({
      error: "Error checking subscription status",
      has_active_subscription: false,
      subscriptions: []
    }, { status: 200 });
  }
};