'use client';

import { cn } from '@/lib/utils';

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
}

const Container = ({ children, className }: ContainerProps) => {
  return (
    <div className={cn('mx-auto w-[90%] px-8 sm:px-12 lg:px-16', className)}>
      {children}
    </div>
  );
};

export default Container;
