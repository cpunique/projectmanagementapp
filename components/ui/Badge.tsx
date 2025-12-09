'use client';

import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md';
}

const Badge = ({ className, variant = 'default', size = 'sm', ...props }: BadgeProps) => {
  const variants = {
    default: 'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100',
    primary: 'bg-purple-200 text-purple-900 dark:bg-purple-900 dark:text-purple-200',
    success: 'bg-green-200 text-green-900 dark:bg-green-900 dark:text-green-200',
    warning: 'bg-yellow-200 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-200',
    danger: 'bg-red-200 text-red-900 dark:bg-red-900 dark:text-red-200',
  };

  const sizes = {
    sm: 'px-2 py-1 text-xs font-semibold rounded',
    md: 'px-3 py-1.5 text-sm font-semibold rounded-md',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
};

Badge.displayName = 'Badge';

export default Badge;
