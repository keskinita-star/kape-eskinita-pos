import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Overview from "./Overview";
import ProductsManagement from "./ProductsManagement";
import OrdersManagement from "./OrdersManagement";
import SalesReport from "./SalesReport";
import UsersManagement from "./UsersManagement";

const NAV = [
  { key:"overview", label:"Overview", icon:"📊" },
  { key:"products", label:"Products", icon:"📦" },
  { key:"orders", label:"Orders", icon:"🧾" },
  { key:"sales", label:"Sales Report", icon:"📈" },
  { key:"users", label:"Users", icon:"👥" },
];

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [page, setPage] = useState("overview");

  const pages = { overview: <Overview />, products: <ProductsManagement />, orders: <OrdersManagement />, sales: <SalesReport />, users: <UsersManagement /> };

  return (
    <div style={{ display:"grid", gridTemplateColumns:"220px 1fr", height:"100vh", background:"#f5f3ee" }}>
      {/* Sidebar */}
      <div style={{ background:"#1a1814", display:"flex", flexDirection:"column", padding:"24px 0" }}>
        <div style={{ padding:"0 20px 24px", borderBottom:"0.5px solid #2c2924" }}>
          <div style={{ fontSize:20 }}>☕</div>
          <div style={{ fontSize:14, fontWeight:600, color:"#f5f3ee", marginTop:6 }}>Kape Eskinita</div>
          <div style={{ fontSize:11, color:"#6b6860", marginTop:2 }}>Admin Panel</div>
        </div>
        <nav style={{ flex:1, padding:"16px 12px", display:"flex", flexDirection:"column", gap:4 }}>
          {NAV.map(n => (
            <button key={n.key} onClick={() => setPage(n.key)}
              style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 12px", borderRadius:8, border:"none", background: page===n.key ? "#2d2260" : "transparent", color: page===n.key ? "#ede9fd" : "#9a9690", fontSize:13, fontWeight: page===n.key ? 600 : 400, textAlign:"left", transition:"all 0.15s" }}>
              <span style={{ fontSize:15 }}>{n.icon}</span>{n.label}
            </button>
          ))}
        </nav>
        <div style={{ padding:"0 12px" }}>
          <div style={{ fontSize:12, color:"#6b6860", padding:"0 12px", marginBottom:8 }}>👤 {user?.name}</div>
          <button onClick={logout} style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"0.5px solid #2c2924", background:"transparent", color:"#9a9690", fontSize:12 }}>Sign out</button>
        </div>
      </div>
      {/* Content */}
      <div style={{ overflowY:"auto", padding:24 }}>
        {pages[page]}
      </div>
    </div>
  );
}