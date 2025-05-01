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
  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <motion.div
            onClick={onClick}
            className={classNames(
              'relative flex flex-col items-center p-6 rounded-xl',
              'w-full h-full min-h-[160px]',
              'bg-white dark:bg-[#141414]',
              'border border-[#E5E5E5] dark:border-[#333333]',
              'group',
              'hover:bg-[#F7F9FC] dark:hover:bg-[#1a1a1a]',
              'hover:border-[#3366FF]/30 dark:hover:border-[#3366FF]/30',
              isActive ? 'border-[#3366FF] dark:border-[#3366FF]/50 bg-[#3366FF]/5 dark:bg-[#3366FF]/10' : '',
              isLoading ? 'cursor-wait opacity-70' : '',
              className || '',
            )}
          >
            {/* Main Content */}
            <div className="flex flex-col items-center justify-center flex-1 w-full">
              {/* Icon */}
              <motion.div
                className={classNames(
                  'relative',
                  'w-14 h-14',
                  'flex items-center justify-center',
                  'rounded-xl',
                  'bg-gray-100 dark:bg-gray-800',
                  'ring-1 ring-gray-200 dark:ring-gray-700',
                  'group-hover:bg-[#3366FF]/10 dark:group-hover:bg-gray-700/80',
                  'group-hover:ring-[#3366FF]/20 dark:group-hover:ring-[#3366FF]/30',
                  isActive ? 'bg-[#3366FF]/10 dark:bg-[#3366FF]/10 ring-[#3366FF]/30 dark:ring-[#3366FF]/20' : '',
                )}
              >
                <motion.div
                  className={classNames(
                    TAB_ICONS[tab.id],
                    'w-8 h-8',
                    'text-[#8F9BB3] dark:text-gray-300',
                    'group-hover:text-[#3366FF] dark:group-hover:text-[#3366FF]/80',
                    isActive ? 'text-[#3366FF] dark:text-[#3366FF]/90' : '',
                  )}
                />
              </motion.div>

              {/* Label and Description */}
              <div className="flex flex-col items-center mt-5 w-full">
                <h3
                  className={classNames(
                    'text-[15px] font-medium leading-snug mb-2',
                    'text-gray-700 dark:text-gray-200',
                    'group-hover:text-[#3366FF] dark:group-hover:text-[#3366FF]/90',
                    isActive ? 'text-[#3366FF] dark:text-[#3366FF]/90' : '',
                  )}
                >
                  {TAB_LABELS[tab.id]}
                </h3>
                {description && (
                  <p
                    className={classNames(
                      'text-[13px] leading-relaxed',
                      'text-[#8F9BB3] dark:text-gray-400',
                      'max-w-[85%]',
                      'text-center',
                      'group-hover:text-[#3366FF]/80 dark:group-hover:text-[#3366FF]/70',
                      isActive ? 'text-[#3366FF]/80 dark:text-[#3366FF]/80' : '',
                    )}
                  >
                    {description}
                  </p>
                )}
              </div>
            </div>

            {/* Update Indicator with Tooltip */}
            {hasUpdate && (
              <>
                <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-[#3366FF] dark:bg-[#3366FF] animate-pulse" />
                <Tooltip.Portal>
                  <Tooltip.Content
                    className={classNames(
                      'px-3 py-1.5 rounded-lg',
                      'bg-[#18181B] text-white',
                      'text-sm font-medium',
                      'select-none',
                      'z-[100]',
                    )}
                    side="top"
                    sideOffset={5}
                  >
                    {statusMessage}
                    <Tooltip.Arrow className="fill-[#18181B]" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </>
            )}

            {/* Children (e.g. Beta Label) */}
            {children}
          </motion.div>
        </Tooltip.Trigger>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
};
