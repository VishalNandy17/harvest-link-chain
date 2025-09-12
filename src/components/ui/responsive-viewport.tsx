import React from 'react';
import { useResponsive } from '@/hooks/use-responsive';

interface ResponsiveViewportProps {
  /**
   * Content to render on mobile devices
   */
  mobileContent: React.ReactNode;
  
  /**
   * Content to render on tablet devices
   */
  tabletContent?: React.ReactNode;
  
  /**
   * Content to render on desktop devices
   */
  desktopContent?: React.ReactNode;
  
  /**
   * Whether to use the tablet content as fallback for desktop if no desktop content is provided
   * @default true
   */
  useTabletForDesktop?: boolean;
  
  /**
   * Whether to use the mobile content as fallback for tablet if no tablet content is provided
   * @default true
   */
  useMobileForTablet?: boolean;
}

/**
 * A component that renders different content based on the viewport size
 */
export function ResponsiveViewport({
  mobileContent,
  tabletContent,
  desktopContent,
  useTabletForDesktop = true,
  useMobileForTablet = true,
}: ResponsiveViewportProps) {
  const { isMobile, isTablet, isDesktop } = useResponsive();
  
  if (isDesktop) {
    return (
      <>{desktopContent || (useTabletForDesktop && tabletContent) || mobileContent}</>
    );
  }
  
  if (isTablet) {
    return (
      <>{tabletContent || (useMobileForTablet && mobileContent) || desktopContent}</>
    );
  }
  
  return <>{mobileContent}</>;
}

/**
 * A component that conditionally renders content based on the viewport size
 */
export function Viewport({
  children,
  mobile,
  tablet,
  desktop,
}: {
  children: React.ReactNode;
  mobile?: boolean;
  tablet?: boolean;
  desktop?: boolean;
}) {
  const { isMobile, isTablet, isDesktop } = useResponsive();
  
  if (mobile && !isMobile) return null;
  if (tablet && !isTablet) return null;
  if (desktop && !isDesktop) return null;
  if (!mobile && !tablet && !desktop) return <>{children}</>;
  
  if (
    (mobile && isMobile) ||
    (tablet && isTablet) ||
    (desktop && isDesktop)
  ) {
    return <>{children}</>;
  }
  
  return null;
}