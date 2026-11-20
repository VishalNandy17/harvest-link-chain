import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { DashboardFrame } from "@/components/DashboardFrame";
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
import QRDetails from "./pages/QRDetails";
import PDSOperations from "./pages/PDSOperations";
import PDSLotDetails from "./pages/PDSLotDetails";

// Role-specific dashboards
import FarmerDashboard from "@/pages/dashboards/FarmerDashboard";
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
            <Route path="/lot/:lotId" element={<PDSLotDetails />} />
            
            {/* Protected routes */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/pds" element={
              <ProtectedRoute>
                <DashboardFrame><PDSOperations /></DashboardFrame>
              </ProtectedRoute>
            } />
            
            {/* Role-specific dashboard routes */}
            <Route path="/dashboards/farmer" element={
              <ProtectedRoute>
                <DashboardFrame><FarmerDashboard /></DashboardFrame>
              </ProtectedRoute>
            } />
            
            <Route path="/dashboards/distributor" element={
              <ProtectedRoute>
                <DashboardFrame><DistributorDashboard /></DashboardFrame>
              </ProtectedRoute>
            } />
            
            <Route path="/dashboards/retailer" element={
              <ProtectedRoute>
                <DashboardFrame><RetailerDashboard /></DashboardFrame>
              </ProtectedRoute>
            } />
            
            <Route path="/dashboards/consumer" element={
              <ProtectedRoute>
                <DashboardFrame><ConsumerDashboard /></DashboardFrame>
              </ProtectedRoute>
            } />
            
            <Route path="/dashboards/admin" element={
              <ProtectedRoute>
                <DashboardFrame><AdminDashboard /></DashboardFrame>
              </ProtectedRoute>
            } />
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
            {/* Public QR details routes (external QR format) */}
            <Route path="/p/:id/:unique" element={<QRDetails />} />
            <Route path="/b/:id/:unique" element={<QRDetails />} />
          </Routes>
          <PWAInstallPrompt />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
