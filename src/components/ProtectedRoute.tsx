import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { UserRole } from '@/lib/types'

interface ProtectedRouteProps {
  children: ReactNode
  allowedRoles?: UserRole[]
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, loading, userRole } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-farm-primary mb-4"></div>
        <p className="text-gray-600 font-medium">Loading your dashboard...</p>
        <p className="text-sm text-gray-500 mt-2">This may take a moment while we verify your credentials.</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
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