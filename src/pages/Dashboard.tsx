import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole } from "@/lib/types";

const Dashboard = () => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Only redirect if we're not in a loading state and have user data
    if (!loading && user && userRole) {
      // Add a small delay to prevent potential redirect loops
      const redirectTimer = setTimeout(() => {
        // Redirect based on user role
        switch (userRole) {
          case UserRole.FARMER:
            navigate("/dashboards/farmer", { replace: true });
            break;
          case UserRole.DISTRIBUTOR:
            navigate("/dashboards/distributor", { replace: true });
            break;
          case UserRole.RETAILER:
            navigate("/dashboards/retailer", { replace: true });
            break;
          case UserRole.CONSUMER:
            navigate("/dashboards/consumer", { replace: true });
            break;
          case UserRole.ADMIN:
            navigate("/dashboards/admin", { replace: true });
            break;
          default:
            // If role is not set or unknown, show a generic dashboard
            // This could be a fallback or error state
            console.log("Unknown user role:", userRole);
        }
      }, 300); // Small delay to prevent potential redirect loops
      
      return () => clearTimeout(redirectTimer);
    }
  }, [user, userRole, navigate, loading]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Redirecting to your dashboard...</h1>
            <p className="text-gray-600 mt-2">
              {loading ? 'Verifying your credentials...' : `Welcome, ${user?.email || 'User'}`}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-farm-primary mb-4"></div>
          <p className="text-gray-600 font-medium mt-4">Preparing your personalized dashboard</p>
          <p className="text-sm text-gray-500 mt-2">This will only take a moment</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
