import React from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveGridProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Content to be rendered inside the grid
   */
  children: React.ReactNode;
  
  /**
   * Additional class names to apply to the grid
   */
  className?: string;
  
  /**
   * Number of columns on mobile screens
   * @default 1
   */
  cols?: 1 | 2 | 3 | 4 | 5 | 6;
  
  /**
   * Number of columns on tablet screens (md)
   * @default 2
   */
  colsMd?: 1 | 2 | 3 | 4 | 5 | 6;
  
  /**
   * Number of columns on desktop screens (lg)
   * @default 3
   */
  colsLg?: 1 | 2 | 3 | 4 | 5 | 6;
  
  /**
   * Number of columns on large desktop screens (xl)
   * @default 4
   */
  colsXl?: 1 | 2 | 3 | 4 | 5 | 6;
  
  /**
   * Gap between grid items
   * @default "4" (1rem)
   */
  gap?: "0" | "1" | "2" | "3" | "4" | "5" | "6" | "8" | "10" | "12";
}

/**
 * A responsive grid component that adapts to different screen sizes
 * with configurable columns and gap.
 */
export function ResponsiveGrid({
  children,
  className,
  cols = 1,
  colsMd = 2,
  colsLg = 3,
  colsXl = 4,
  gap = "4",
  ...props
}: ResponsiveGridProps) {
  return (
    <div
      className={cn(
        `grid grid-cols-${cols} md:grid-cols-${colsMd} lg:grid-cols-${colsLg} xl:grid-cols-${colsXl} gap-${gap}`,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}