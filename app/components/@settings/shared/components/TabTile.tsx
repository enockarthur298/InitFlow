import { motion } from 'framer-motion';
import * as Tooltip from '@radix-ui/react-tooltip';
import { classNames } from '~/utils/classNames';
import type { TabVisibilityConfig } from '~/components/@settings/core/types';
import { TAB_LABELS, TAB_ICONS } from '~/components/@settings/core/constants';

interface TabTileProps {
  tab: TabVisibilityConfig;
  onClick?: () => void;
  isActive?: boolean;
  hasUpdate?: boolean;
  statusMessage?: string;
  description?: string;
  isLoading?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const TabTile: React.FC<TabTileProps> = ({
  tab,
  onClick,
  isActive,
  hasUpdate,
  statusMessage,
  description,
  isLoading,
  className,
  children,
}: TabTileProps) => {
  const hiddenTabs = ['features', 'local-providers', 'service-status', 'debug', 'tab-management'];
  
  if (hiddenTabs.includes(tab.id)) {
    return null;
  }

  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <motion.div
            onClick={onClick}
            className={classNames(
              'relative flex flex-col items-center',
              'p-4 sm:p-5 rounded-xl',
              'w-full h-full min-h-[140px] sm:min-h-[150px]',
              'bg-white dark:bg-[#141414]',
              'border border-[#E5E5E5] dark:border-[#333333]',
              'group',
              'hover:bg-[#F7F9FC] dark:hover:bg-[#1a1a1a]',
              'hover:border-[#3366FF]/30 dark:hover:border-[#3366FF]/30',
              'hover:shadow-sm transition-all duration-200',
              'transform-gpu', // Hardware acceleration
              isActive ? 'border-[#3366FF] dark:border-[#3366FF]/50 bg-[#3366FF]/5 dark:bg-[#3366FF]/10' : '',
              isLoading ? 'cursor-wait opacity-70' : '',
              className || '',
            )}
            whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
            whileTap={{ scale: 0.99 }}
            layout // Animate layout changes
          >
            {/* Main Content */}
            <div className="flex flex-col items-center justify-center w-full flex-1 gap-4">
              {/* Icon Container */}
              <motion.div
                className={classNames(
                  'relative',
                  'w-12 h-12 sm:w-14 sm:h-14', // Responsive sizing
                  'flex items-center justify-center',
                  'rounded-xl',
                  'bg-[#F7F9FC] dark:bg-gray-800',
                  'ring-1 ring-[#E4E9F2] dark:ring-gray-700',
                  'group-hover:bg-[#3366FF]/10 dark:group-hover:bg-[#3366FF]/20',
                  'group-hover:ring-[#3366FF]/20 dark:group-hover:ring-[#3366FF]/30',
                  'transition-all duration-200',
                  isActive ? 'bg-[#3366FF]/10 dark:bg-[#3366FF]/10 ring-[#3366FF]/30 dark:ring-[#3366FF]/20' : '',
                )}
                layout // Animate layout changes
              >
                <motion.div
                  className={classNames(
                    TAB_ICONS[tab.id],
                    'w-6 h-6 sm:w-7 sm:h-7', // Responsive icon size
                    'text-[#8F9BB3] dark:text-gray-300',
                    'group-hover:text-[#3366FF] dark:group-hover:text-[#3366FF]/80',
                    'transition-colors duration-200',
                    isActive ? 'text-[#3366FF] dark:text-[#3366FF]/90' : '',
                  )}
                  layout // Animate layout changes
                />
              </motion.div>

              {/* Text Content */}
              <div className="flex flex-col items-center text-center space-y-1.5 px-2">
                <h3
                  className={classNames(
                    'text-sm font-medium leading-tight',
                    'text-[#222B45] dark:text-gray-200',
                    'group-hover:text-[#3366FF] dark:group-hover:text-[#3366FF]/90',
                    'transition-colors duration-200',
                    isActive ? 'text-[#3366FF] dark:text-[#3366FF]/90' : '',
                  )}
                >
                  {TAB_LABELS[tab.id]}
                </h3>
                {description && (
                  <p
                    className={classNames(
                      'text-xs leading-relaxed',
                      'text-[#8F9BB3] dark:text-gray-400',
                      'max-w-[95%]',
                      'line-clamp-2', // Limit to 2 lines
                      'transition-colors duration-200',
                      'group-hover:text-[#8F9BB3] dark:group-hover:text-gray-300',
                      isActive ? 'text-[#3366FF]/80 dark:text-[#3366FF]/80' : '',
                    )}
                  >
                    {description}
                  </p>
                )}
              </div>
            </div>

            {/* Update Indicator */}
            {hasUpdate && (
              <>
                <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-[#3366FF] animate-pulse" />
                <Tooltip.Portal>
                  <Tooltip.Content
                    className={classNames(
                      'px-2.5 py-1.5 rounded-lg',
                      'bg-[#222B45] text-white',
                      'text-xs font-medium',
                      'select-none shadow-sm',
                      'z-[100]',
                    )}
                    side="top"
                    sideOffset={5}
                  >
                    {statusMessage}
                    <Tooltip.Arrow className="fill-[#222B45]" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </>
            )}

            {children}
          </motion.div>
        </Tooltip.Trigger>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
};
