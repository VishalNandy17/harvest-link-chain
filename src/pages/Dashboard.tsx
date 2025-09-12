import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole } from "@/lib/types";

const Dashboard = () => {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && userRole) {
      // Redirect based on user role
      switch (userRole) {
        case UserRole.FARMER:
          navigate("/dashboards/farmer");
          break;
        case UserRole.DISTRIBUTOR:
          navigate("/dashboards/distributor");
          break;
        case UserRole.RETAILER:
          navigate("/dashboards/retailer");
          break;
        case UserRole.CONSUMER:
          navigate("/dashboards/consumer");
          break;
        case UserRole.ADMIN:
          navigate("/dashboards/admin");
          break;
        default:
          // If role is not set or unknown, show a generic dashboard
          // This could be a fallback or error state
          console.log("Unknown user role:", userRole);
      }
    }
  }, [user, userRole, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Redirecting to your dashboard...</h1>
            <p className="text-gray-600 mt-2">
              Welcome, {user?.email}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
