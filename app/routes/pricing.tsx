import { useEffect } from 'react';
import { useNavigate } from '@remix-run/react';

export default function PricingPage() {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Redirect to the HTML page
    window.location.href = '/pricing.html';
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p>Loading payment page...</p>
      </div>
    </div>
  );
}