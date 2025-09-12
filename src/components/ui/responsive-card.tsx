import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface ResponsiveCardProps extends React.ComponentProps<typeof Card> {
  /**
   * Whether the card should take full width on mobile
   * @default true
   */
  fullWidthOnMobile?: boolean;
  
  /**
   * Whether to add hover effects
   * @default true
   */
  hoverable?: boolean;
  
  /**
   * Whether to add a shadow effect
   * @default true
   */
  shadowed?: boolean;
  
  /**
   * Whether to add a border
   * @default true
   */
  bordered?: boolean;
}

/**
 * A responsive card component that adapts to different screen sizes
 * with configurable styling options.
 */
export function ResponsiveCard({
  children,
  className,
  fullWidthOnMobile = true,
  hoverable = true,
  shadowed = true,
  bordered = true,
  ...props
}: ResponsiveCardProps) {
  return (
    <Card
      className={cn(
        fullWidthOnMobile && "w-full",
        hoverable && "transition-all duration-200 hover:translate-y-[-2px]",
        shadowed && "shadow-md hover:shadow-lg",
        !bordered && "border-0",
        className
      )}
      {...props}
    >
      {children}
    </Card>
  );
}

// Export the card subcomponents for convenience
export {
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
};