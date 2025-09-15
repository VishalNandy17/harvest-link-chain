import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole } from "@/lib/types";

// Map of user roles to their dashboard paths
const DASHBOARD_PATHS = {
  [UserRole.FARMER]: "/dashboards/farmer",
  [UserRole.DISTRIBUTOR]: "/dashboards/distributor",
  [UserRole.RETAILER]: "/dashboards/retailer",
  [UserRole.CONSUMER]: "/dashboards/consumer",
  [UserRole.ADMIN]: "/dashboards/admin",
} as const;

const Dashboard = () => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return; // Wait until auth is loaded

    // If user is not authenticated, redirect to login
    if (!user) {
      navigate("/login", { 
        state: { from: location },
        replace: true 
      });
      return;
    }

    // If user has a role, redirect to appropriate dashboard
    if (userRole && DASHBOARD_PATHS[userRole]) {
      navigate(DASHBOARD_PATHS[userRole], { replace: true });
      return;
    }

    // If user has no role or invalid role, redirect to home
    navigate("/", { replace: true });
  }, [user, userRole, loading, navigate, location]);

  // Return null to prevent any UI flash before redirect
  return null;
};

export default Dashboard;
