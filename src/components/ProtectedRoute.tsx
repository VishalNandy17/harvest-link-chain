import { ReactNode, useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { UserRole } from '@/lib/types'
import { toast } from '@/components/ui/use-toast'

interface ProtectedRouteProps {
  children: ReactNode
  allowedRoles?: UserRole[]
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, loading, userRole } = useAuth()
  const location = useLocation()
  const [isAuthorizing, setIsAuthorizing] = useState(true)

  useEffect(() => {
    let timeout: NodeJS.Timeout
    
    if (!loading) {
      // Add a small delay to prevent flash of loading state
      timeout = setTimeout(() => {
        setIsAuthorizing(false)
      }, 100)
    }
    
    return () => {
      if (timeout) clearTimeout(timeout)
    }
  }, [loading])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        toast({
          title: "Taking longer than expected",
          description: "We're still loading your dashboard. Please wait...",
          variant: "default",
        });
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [loading]);

  if (loading || isAuthorizing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-farm-primary mb-4"></div>
        <p className="text-gray-600 font-medium text-center">Loading your dashboard...</p>
        <p className="text-sm text-gray-500 mt-2 text-center max-w-md">
          This may take a moment while we verify your credentials and load your data.
        </p>
      </div>
    )
  }

  if (!user) {
    // Store the current location to redirect back after login
    useEffect(() => {
      toast({
        title: "Authentication Required",
        description: "Please sign in to access this page.",
        variant: "destructive",
      });
    }, []);
    
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  
  // If specific roles are required and user doesn't have the right role
  if (allowedRoles && allowedRoles.length > 0 && userRole && !allowedRoles.includes(userRole)) {
    // Redirect to the appropriate dashboard based on user role
    switch (userRole) {
      case UserRole.FARMER:
        return <Navigate to="/dashboards/farmer" replace />
      case UserRole.DISTRIBUTOR:
        return <Navigate to="/dashboards/distributor" replace />
      case UserRole.RETAILER:
        return <Navigate to="/dashboards/retailer" replace />
      case UserRole.CONSUMER:
        return <Navigate to="/dashboards/consumer" replace />
      case UserRole.ADMIN:
        return <Navigate to="/dashboards/admin" replace />
      default:
        // Fallback to general dashboard if role is unknown
        return <Navigate to="/" replace />
    }
  }

  return <>{children}</>
}

export default ProtectedRoute