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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-farm-primary"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }
  
  // If specific roles are required and user doesn't have the right role
  if (allowedRoles && allowedRoles.length > 0 && userRole && !allowedRoles.includes(userRole)) {
    // Redirect to the appropriate dashboard based on user role
    if (userRole === 'farmer') {
      return <Navigate to="/dashboard/farmer" replace />
    } else if (userRole === 'distributor') {
      return <Navigate to="/dashboard/distributor" replace />
    } else if (userRole === 'retailer') {
      return <Navigate to="/dashboard/retailer" replace />
    } else if (userRole === 'consumer') {
      return <Navigate to="/dashboard/consumer" replace />
    } else if (userRole === 'admin') {
      return <Navigate to="/dashboard/admin" replace />
    } else {
      // Fallback to general dashboard if role is unknown
      return <Navigate to="/dashboard" replace />
    }
  }

  return <>{children}</>
}

export default ProtectedRoute
