import { json, type ActionFunctionArgs } from '@remix-run/node';
import { getAuth } from '@clerk/remix/ssr.server';

export const action = async ({ request, params, context }: ActionFunctionArgs) => {
  try {
    // Get authentication info - don't return early if not authenticated
    const authResult = await getAuth({ request, params, context });
    const userId = authResult?.userId;
    
    // Get the request body
    const body = await request.json() as { email?: string, user_id?: string };
    
    // Use either the authenticated userId or the one from the request body
    const effectiveUserId = userId || body.user_id;
    
    if (!effectiveUserId) {
      return json({ error: "User ID is required" }, { status: 400 });
    }
    
    // Forward the request to your Python backend
    const pythonBackendUrl = process.env.PYTHON_BACKEND_URL || 'http://localhost:5000';
    
    try {
      const response = await fetch(`${pythonBackendUrl}/api/users/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: effectiveUserId,
          email: body.email || ''
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json() as { error?: string };
        console.error('Error registering user:', errorData.error || response.statusText);
        return json({ 
          error: errorData.error || 'Failed to register user',
          success: false
        }, { status: 200 }); // Return 200 to prevent frontend errors
      }
      
      const data = await response.json();
      return json(data);
    } catch (fetchError) {
      console.error('Network error registering user:', fetchError);
      return json({ 
        error: 'Network error registering user', 
        success: false 
      }, { status: 200 }); // Return 200 to prevent frontend errors
    }
  } catch (error) {
    console.error('Error registering user:', error);
    return json({ 
      error: 'Internal server error', 
      success: false 
    }, { status: 200 }); // Return 200 to prevent frontend errors
  }
};