import { AnimatePresence, cubicBezier, motion } from 'framer-motion';

// Define the custom easing function that was missing
const customEasingFn = cubicBezier(0.25, 0.1, 0.25, 1);

// Update the SendButton props interface to include subscription status
interface SendButtonProps {
  show: boolean;
  isStreaming?: boolean;
  disabled?: boolean;
  hasSubscription?: boolean;
  isCheckingSubscription?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  onImagesSelected?: (images: File[]) => void;
}

// Update the SendButton component to handle subscription status
export const SendButton = ({ 
  show, 
  isStreaming, 
  disabled, 
  hasSubscription = true,
  isCheckingSubscription = false,
  onClick 
}: SendButtonProps) => {
  // Calculate if the button should be disabled - do NOT disable for unsubscribed users
  const isButtonDisabled = disabled || isStreaming || isCheckingSubscription;
  
  // Add tooltip text based on subscription status
  const getTooltipText = () => {
    if (isCheckingSubscription) return "Checking subscription...";
    if (!hasSubscription) return "Subscribe to send messages";
    if (isStreaming) return "Stop generating";
    if (disabled) return "Type a message";
    return "Send message";
  };
  
  return (
    <AnimatePresence>
      {show ? (
        <motion.button
          className={`
            absolute flex justify-center items-center top-[18px] right-[22px]
            p-1.5 rounded-xl w-[38px] h-[38px] transition-all duration-200
            bg-gradient-to-r from-[#7B61FF] to-[#1A73E8]
            hover:shadow-lg hover:shadow-purple-500/20 hover:scale-105
            active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
            disabled:hover:scale-100 disabled:hover:shadow-none
            text-white backdrop-blur-sm
          `}
          transition={{ 
            ease: customEasingFn, 
            duration: 0.2,
            scale: {
              type: "spring",
              stiffness: 400,
              damping: 17
            }
          }}
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.9 }}
          disabled={isButtonDisabled}
          onClick={(event) => {
            event.preventDefault();
            if (!isButtonDisabled) {
              onClick?.(event);
            }
          }}
          title={getTooltipText()}
        >
          {isStreaming ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 6h12v12H6z" fill="currentColor" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M5 13.5l7 4.5 7-4.5M5 9l7 4.5L19 9M12 4.5L5 9l7 4.5L19 9l-7-4.5z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
};
