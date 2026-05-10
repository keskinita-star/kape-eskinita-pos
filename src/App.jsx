// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AdminDashboard from "./components/admin/AdminDashboard";
import CashierDashboard from "./components/cashier/POS"; // You'll need this
import Login from "./components/auth/Login";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

function ProtectedRoute({ children, allowedRoles }) {
  const { user, userRole, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        fontSize: "18px",
        color: "#666"
      }}>
        Loading...
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Check if user has required role
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    // Redirect to appropriate dashboard based on role
    if (userRole === 'admin') {
      return <Navigate to="/admin" replace />;
    } else if (userRole === 'cashier') {
      return <Navigate to="/cashier" replace />;
    }
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Admin routes */}
          <Route 
            path="/admin/*" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          
          {/* Cashier routes */}
          <Route 
            path="/cashier/*" 
            element={
              <ProtectedRoute allowedRoles={['cashier']}>
                <CashierDashboard />
              </ProtectedRoute>
            } 
          />
          
          {/* Default redirect based on role */}
          <Route 
            path="/" 
            element={<NavigateToDashboard />} 
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

// Helper component to redirect based on user role
function NavigateToDashboard() {
  const { userRole, loading } = useAuth();
  
  if (loading) return null;
  
  if (userRole === 'admin') {
    return <Navigate to="/admin" replace />;
  } else if (userRole === 'cashier') {
    return <Navigate to="/cashier" replace />;
  }
  
  return <Navigate to="/login" replace />;
}