// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AdminDashboard from "./components/admin/AdminDashboard";
import CashierDashboard from "./components/cashier/POS";
import Login from "./components/auth/Login";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

// Roles that have admin-level access
const ADMIN_ROLES = ["admin", "owner"];

function getHomeForRole(role) {
  if (ADMIN_ROLES.includes(role)) return "/admin";
  if (role === "cashier") return "/cashier";
  return "/login";
}

function ProtectedRoute({ children, allowedRoles }) {
  const { user, userRole, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: "flex", justifyContent: "center", alignItems: "center",
        height: "100vh", fontSize: 18, color: "#666",
      }}>
        Loading...
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to={getHomeForRole(userRole)} replace />;
  }

  return children;
}

function NavigateToDashboard() {
  const { user, userRole, loading } = useAuth();

  // Wait until auth + role are fully resolved before redirecting
  if (loading) {
    return (
      <div style={{
        display: "flex", justifyContent: "center", alignItems: "center",
        height: "100vh", fontSize: 18, color: "#666",
      }}>
        Loading...
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={getHomeForRole(userRole)} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Admin + Owner share the same dashboard */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRoles={["admin", "owner"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Cashier POS */}
          <Route
            path="/cashier/*"
            element={
              <ProtectedRoute allowedRoles={["cashier"]}>
                <CashierDashboard />
              </ProtectedRoute>
            }
          />

          {/* Catch-all: redirect based on role */}
          <Route path="*" element={<NavigateToDashboard />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}