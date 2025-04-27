import { AnimatePresence, cubicBezier, motion } from 'framer-motion';

interface SendButtonProps {
  show: boolean;
  isStreaming?: boolean;
  disabled?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  onImagesSelected?: (images: File[]) => void;
}

const customEasingFn = cubicBezier(0.4, 0, 0.2, 1);

export const SendButton = ({ show, isStreaming, disabled, onClick }: SendButtonProps) => {
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
          disabled={disabled}
          onClick={(event) => {
            event.preventDefault();
            if (!disabled) {
              onClick?.(event);
            }
          }}
        >
          <div className="text-lg">
            {!isStreaming ? (
              <div className="i-ph:arrow-right text-xl transform transition-transform group-hover:translate-x-0.5"></div>
            ) : (
              <div className="i-ph:stop-circle-bold text-xl"></div>
            )}
          </div>
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
};
