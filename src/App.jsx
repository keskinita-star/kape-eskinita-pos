import { useAuth } from "./contexts/AuthContext";
import Login from "./components/auth/Login";
import POS from "./components/cashier/POS";
import AdminDashboard from "./components/admin/AdminDashboard";

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", fontSize:18, color:"#4a3d8f" }}>
      ☕ Loading Kape Eskinita...
    </div>
  );

  if (!user) return <Login />;
  if (user.role === "cashier") return <POS />;
  return <AdminDashboard />;
}