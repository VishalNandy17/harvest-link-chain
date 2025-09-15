import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import ProtectedRoute from "@/components/ProtectedRoute";
import { UserRole } from "@/lib/types";

// Pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

// Role-specific dashboards
import FarmerDashboard from "@/pages/dashboards/FarmerDashboardV2";
import DistributorDashboard from "@/pages/dashboards/DistributorDashboard";
import RetailerDashboard from "@/pages/dashboards/RetailerDashboard";
import ConsumerDashboard from "@/pages/dashboards/ConsumerDashboard";
import AdminDashboard from "@/pages/dashboards/AdminDashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            
            {/* Protected routes */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            
            {/* Role-specific dashboard routes */}
            <Route path="/dashboards/farmer" element={
              <ProtectedRoute allowedRoles={[UserRole.FARMER, UserRole.ADMIN]}>
                <FarmerDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/dashboards/distributor" element={
              <ProtectedRoute allowedRoles={[UserRole.DISTRIBUTOR, UserRole.ADMIN]}>
                <DistributorDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/dashboards/retailer" element={
              <ProtectedRoute allowedRoles={[UserRole.RETAILER, UserRole.ADMIN]}>
                <RetailerDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/dashboards/consumer" element={
              <ProtectedRoute allowedRoles={[UserRole.CONSUMER, UserRole.ADMIN]}>
                <ConsumerDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/dashboards/admin" element={
              <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <PWAInstallPrompt />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
