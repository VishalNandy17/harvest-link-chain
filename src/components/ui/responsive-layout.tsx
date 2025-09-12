import React from 'react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface ResponsiveLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Content to be rendered inside the layout
   */
  children: React.ReactNode;
  
  /**
   * Additional class names to apply to the layout
   */
  className?: string;
  
  /**
   * Layout direction on mobile
   * @default "col"
   */
  mobileDirection?: "row" | "col" | "row-reverse" | "col-reverse";
  
  /**
   * Layout direction on desktop
   * @default "row"
   */
  desktopDirection?: "row" | "col" | "row-reverse" | "col-reverse";
  
  /**
   * Gap between layout items
   * @default "4" (1rem)
   */
  gap?: "0" | "1" | "2" | "3" | "4" | "5" | "6" | "8" | "10" | "12";
  
  /**
   * Whether to wrap items
   * @default false
   */
  wrap?: boolean;
  
  /**
   * Alignment of items along the cross axis
   */
  align?: "start" | "center" | "end" | "stretch" | "baseline";
  
  /**
   * Alignment of items along the main axis
   */
  justify?: "start" | "center" | "end" | "between" | "around" | "evenly";
}

/**
 * A responsive layout component that adapts to different screen sizes
 * with configurable direction, alignment, and spacing.
 */
export function ResponsiveLayout({
  children,
  className,
  mobileDirection = "col",
  desktopDirection = "row",
  gap = "4",
  wrap = false,
  align,
  justify,
  ...props
}: ResponsiveLayoutProps) {
  const isMobile = useIsMobile();
  
  return (
    <div
      className={cn(
        "flex",
        isMobile ? `flex-${mobileDirection}` : `flex-${desktopDirection}`,
        wrap && "flex-wrap",
        gap && `gap-${gap}`,
        align && `items-${align}`,
        justify && `justify-${justify}`,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * A component that conditionally renders content based on screen size
 */
export function ResponsiveShow({
  children,
  onlyMobile = false,
  onlyDesktop = false,
}: {
  children: React.ReactNode;
  onlyMobile?: boolean;
  onlyDesktop?: boolean;
}) {
  const isMobile = useIsMobile();
  
  if (onlyMobile && !isMobile) return null;
  if (onlyDesktop && isMobile) return null;
  
  return <>{children}</>;
}