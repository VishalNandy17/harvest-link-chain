import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingIndicatorProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  fullScreen?: boolean;
  className?: string;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  size = 'md',
  message = 'Loading...',
  fullScreen = false,
  className,
}) => {
  // Size mappings
  const sizeClasses = {
    sm: 'h-8 w-8 border-2',
    md: 'h-12 w-12 border-3',
    lg: 'h-16 w-16 border-4',
  };

  const containerClasses = fullScreen ? 'fixed inset-0 z-50 bg-background/80 backdrop-blur-sm' : 'w-full';

  return (
    <div className={cn(
      containerClasses,
      'flex flex-col items-center justify-center',
      className
    )}>
      <div className={cn(
        'animate-spin rounded-full border-t-transparent border-farm-primary',
        sizeClasses[size]
      )} />
      {message && (
        <p className="mt-4 text-sm text-muted-foreground font-medium">{message}</p>
      )}
    </div>
  );
};

export { LoadingIndicator };