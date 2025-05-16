import * as RadixDialog from '@radix-ui/react-dialog';

interface SubscriptionDialogProps {
  open: boolean;
  onClose: () => void;
  onNavigateToPricing: () => void;
  isCheckingSubscription?: boolean;
  subscriptionError?: string | null;
}

export const SubscriptionDialog = ({ 
  open, 
  onClose, 
  onNavigateToPricing,
  isCheckingSubscription = false,
  subscriptionError = null
}: SubscriptionDialogProps) => {
  // Force dialog to be visible when open is true
  console.log('SubscriptionDialog open:', open); // Debug log to verify open state
  
  return (
    <RadixDialog.Root open={open} onOpenChange={onClose}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 bg-black/70 z-[9999]" />
        <RadixDialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-lg shadow-xl max-w-md w-full z-[10000] border-2 border-blue-500">
          <RadixDialog.Title className="text-xl font-bold mb-4 text-blue-600">Subscription Required</RadixDialog.Title>
          <RadixDialog.Description className="mb-6 text-gray-700 text-base">
            <p className="font-medium">You need an active subscription to send messages. Would you like to subscribe now?</p>
            
            {isCheckingSubscription && (
              <div className="mt-4 flex items-center text-blue-600">
                <div className="animate-spin mr-2 h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                <span>Checking subscription status...</span>
              </div>
            )}
            
            {subscriptionError && !isCheckingSubscription && (
              <div className="mt-4 text-amber-600 p-2 bg-amber-50 rounded">
                {subscriptionError}
              </div>
            )}
          </RadixDialog.Description>
          <div className="flex justify-end gap-4">
            <button 
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 transition-colors"
              disabled={isCheckingSubscription}
            >
              Cancel
            </button>
            <button 
              onClick={onNavigateToPricing}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              disabled={isCheckingSubscription}
            >
              View Pricing
            </button>
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
};
