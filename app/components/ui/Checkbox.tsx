import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import { classNames } from '~/utils/classNames';

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={classNames(
      'peer h-4 w-4 shrink-0 rounded-md border transition-all duration-200',
      'bg-transparent dark:bg-transparent',
      'border-[#3366FF]/30 dark:border-[#3366FF]/20',
      'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:ring-[#3366FF] focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-950',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'data-[state=checked]:bg-[#3366FF] dark:data-[state=checked]:bg-[#3366FF]',
      'data-[state=checked]:border-[#3366FF] dark:data-[state=checked]:border-[#3366FF]',
      'data-[state=checked]:scale-105',
      'hover:border-[#3366FF]/50 dark:hover:border-[#3366FF]/40',
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center text-white">
      <span className="i-ph:check-bold h-3 w-3" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = 'Checkbox';

export { Checkbox };
