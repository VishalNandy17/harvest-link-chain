import { useState, useEffect } from 'react';

type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
type Orientation = 'portrait' | 'landscape';

interface ResponsiveConfig {
  breakpoints: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    '2xl': number;
  };
}

const defaultConfig: ResponsiveConfig = {
  breakpoints: {
    xs: 0,
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
  },
};

export function useResponsive(config: ResponsiveConfig = defaultConfig) {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  const [breakpoint, setBreakpoint] = useState<Breakpoint>('xs');
  const [orientation, setOrientation] = useState<Orientation>('portrait');

  useEffect(() => {
    // Handler to call on window resize
    function handleResize() {
      // Set window width/height to state
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });

      // Determine current breakpoint
      const { breakpoints } = config;
      if (window.innerWidth >= breakpoints['2xl']) {
        setBreakpoint('2xl');
      } else if (window.innerWidth >= breakpoints.xl) {
        setBreakpoint('xl');
      } else if (window.innerWidth >= breakpoints.lg) {
        setBreakpoint('lg');
      } else if (window.innerWidth >= breakpoints.md) {
        setBreakpoint('md');
      } else if (window.innerWidth >= breakpoints.sm) {
        setBreakpoint('sm');
      } else {
        setBreakpoint('xs');
      }

      // Determine orientation
      setOrientation(window.innerWidth > window.innerHeight ? 'landscape' : 'portrait');
    }

    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Call handler right away so state gets updated with initial window size
    handleResize();
    
    // Remove event listener on cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []); // Empty array ensures that effect is only run on mount and unmount

  const isXs = breakpoint === 'xs';
  const isSm = breakpoint === 'sm';
  const isMd = breakpoint === 'md';
  const isLg = breakpoint === 'lg';
  const isXl = breakpoint === 'xl';
  const is2Xl = breakpoint === '2xl';

  const isPortrait = orientation === 'portrait';
  const isLandscape = orientation === 'landscape';

  const isMobile = isXs || isSm;
  const isTablet = isMd;
  const isDesktop = isLg || isXl || is2Xl;

  return {
    windowSize,
    breakpoint,
    orientation,
    isXs,
    isSm,
    isMd,
    isLg,
    isXl,
    is2Xl,
    isPortrait,
    isLandscape,
    isMobile,
    isTablet,
    isDesktop,
  };
}