import React from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Content to be rendered inside the container
   */
  children: React.ReactNode;
  
  /**
   * Additional class names to apply to the container
   */
  className?: string;
  
  /**
   * Maximum width of the container
   * @default "7xl" (80rem/1280px)
   */
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl" | "7xl" | "full" | "min" | "max" | "fit";
  
  /**
   * Padding to apply on small screens
   * @default "4" (1rem)
   */
  paddingX?: "0" | "1" | "2" | "3" | "4" | "5" | "6" | "8" | "10" | "12";
  
  /**
   * Padding to apply on medium screens and up
   * @default "6" (1.5rem)
   */
  paddingXMd?: "0" | "1" | "2" | "3" | "4" | "5" | "6" | "8" | "10" | "12";
  
  /**
   * Whether to center the container
   * @default true
   */
  centered?: boolean;
}

/**
 * A responsive container component that adapts to different screen sizes
 * with configurable max-width and padding.
 */
export function ResponsiveContainer({
  children,
  className,
  maxWidth = "7xl",
  paddingX = "4",
  paddingXMd = "6",
  centered = true,
  ...props
}: ResponsiveContainerProps) {
  return (
    <div
      className={cn(
        `w-full px-${paddingX} md:px-${paddingXMd}`,
        centered && "mx-auto",
        maxWidth !== "full" && `max-w-${maxWidth}`,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}