import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/layout/Layout";
import RouteGuard from "./components/RouteGuard";
import AdminRoute from "./components/routes/AdminRoute";
import ManagerRoute from "./components/routes/ManagerRoute";
import Dashboard from "./pages/shared/dashboard";
import Tasks from "./pages/shared/tasks";
import Users from "./pages/admin/users";
import Reports from "./pages/shared/reports";
import Profile from "./pages/user/profile";
import ProfileApprovals from "./pages/admin/profile-approvals";
import ProductionChainsList from "./pages/admin/production-chains/ChainsList";
import Login from "./pages/login";
import ChangePassword from "./pages/user/profile/change-password";

import { AuthContext } from "./contexts/authContext";
import { AuthProvider } from "./contexts/AuthContext.tsx";
import { ToastProvider } from "./contexts/ToastContext.tsx";
import { useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function AppContent() {
  // Lấy thông tin người dùng từ context
  const { user } = useContext(AuthContext)!;
  const navigate = useNavigate();

  // Chuyển hướng đến dashboard nếu đã đăng nhập
  useEffect(() => {
    if (user && window.location.pathname === "/login") {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  return (
    <Routes>
      {/* Public route - only accessible when not authenticated */}
      <Route
        path="/login"
        element={user ? <Navigate to="/dashboard" replace /> : <Login />}
      />

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Protected routes */}
      <Route element={<RouteGuard><Layout /></RouteGuard>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/change-password" element={<ChangePassword />} />
        <Route
          path="/users"
          element={(
            <AdminRoute>
              <Users />
            </AdminRoute>
          )}
        />
        <Route
          path="/profile-approvals"
          element={(
            <AdminRoute>
              <ProfileApprovals />
            </AdminRoute>
          )}
        />
        <Route
          path="/production-chains"
          element={(
            <ManagerRoute>
              <ProductionChainsList />
            </ManagerRoute>
          )}
        />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}
