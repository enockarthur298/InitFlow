import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { getAuth } from '@clerk/remix/ssr.server';

export const loader = async ({ request, params, context }: LoaderFunctionArgs) => {
  try {
    const { userId, sessionClaims } = await getAuth({ request, params, context });
    
    if (!userId) {
      // Return 200 with empty data instead of 401 to prevent console errors
      return json({ 
        authenticated: false,
        userId: null,
        email: null
      }, { status: 200 });
    }
    
    // Return user information from session claims
    return json({
      authenticated: true,
      userId,
      email: sessionClaims?.email,
      firstName: sessionClaims?.firstName,
      lastName: sessionClaims?.lastName
    });
  } catch (error) {
    console.error('Error in api.users.me:', error);
    return json({ 
      authenticated: false,
      userId: null,
      email: null,
      error: 'Failed to get user information'
    }, { status: 200 });
  }
};