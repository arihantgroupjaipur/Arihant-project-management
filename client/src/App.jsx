import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import EngineerDashboard from "./pages/EngineerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import WorkOrder from "./pages/WorkOrder";
import Certification from "./pages/Certification";
import NotFound from "./pages/NotFound";
import TaskDashboard from "./pages/TaskDashboard";
import PurchaseDashboard from "./pages/PurchaseDashboard";
import AccountDashboard from "./pages/AccountDashboard";
import ProjectManagerRoute from "@/components/ProjectManagerRoute";
import PurchaseManagerRoute from "@/components/PurchaseManagerRoute";
import AccountManagerRoute from "@/components/AccountManagerRoute";
import EngineerRoute from "@/components/EngineerRoute";
import SuperAdminRoute from "@/components/SuperAdminRoute";
import AuthCallback from "./pages/AuthCallback";
import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from "./pages/ForgotPassword";
import PendingApproval from "./pages/PendingApproval";

const queryClient = new QueryClient();
const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner theme="dark" position="top-right" toastOptions={{
          style: {
            background: "hsl(222 47% 6%)",
            border: "1px solid hsl(0 0% 100% / 0.1)",
            color: "hsl(210 40% 98%)",
          },
        }} />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth-callback" element={<AuthCallback />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/pending-approval" element={<PendingApproval />} />
            <Route path="/engineer" element={
              <EngineerRoute>
                <AdminDashboard />
              </EngineerRoute>
            } />
            <Route path="/admin" element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            } />
            <Route path="/work-order" element={
              <ProtectedRoute>
                <WorkOrder />
              </ProtectedRoute>
            } />
            <Route path="/certification" element={
              <ProtectedRoute>
                <Certification />
              </ProtectedRoute>
            } />
            <Route path="/project-manager" element={
              <ProjectManagerRoute>
                <AdminDashboard />
              </ProjectManagerRoute>
            } />
            <Route path="/purchase" element={
              <PurchaseManagerRoute>
                <AdminDashboard />
              </PurchaseManagerRoute>
            } />
            <Route path="/accounts" element={
              <AccountManagerRoute>
                <AccountDashboard />
              </AccountManagerRoute>
            } />
            <Route path="/super-admin" element={
              <SuperAdminRoute>
                <AdminDashboard />
              </SuperAdminRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>);
export default App;
