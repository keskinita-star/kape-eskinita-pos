import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import MenuManagement from "./MenuManagement";
import Inventory from "./Inventory";
import EmployeeSchedule from "./EmployeeSchedule";
import SalesReport from "./SalesReport";

const NAV = [
  { key:"sales", label:"Sales Report", icon:"📈" },
  { key:"menu", label:"Menu", icon:"☕" },
  { key:"inventory", label:"Inventory", icon:"📦" },
  { key:"schedule", label:"Schedule", icon:"🗓️" },
];

export default function ManagerDashboard() {
  const { user, logout } = useAuth();
  const [page, setPage] = useState("sales");

  const pages = {
    sales: <SalesReport />,
    menu: <MenuManagement />,
    inventory: <Inventory />,
    schedule: <EmployeeSchedule />,
  };

  return (
    <div style={{ display:"grid", gridTemplateColumns:"220px 1fr", height:"100vh", background:"#f5f3ee", fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>
      {/* Sidebar */}
      <div style={{ background:"#1a1814", display:"flex", flexDirection:"column", padding:"24px 0" }}>
        <div style={{ padding:"0 20px 24px", borderBottom:"1px solid #2c2924" }}>
          <div style={{ fontSize:22 }}>☕</div>
          <div style={{ fontSize:14, fontWeight:700, color:"#f5f3ee", marginTop:6 }}>Kape Eskinita</div>
          <div style={{ fontSize:11, color:"#6b6860", marginTop:2 }}>Owner Panel</div>
        </div>
        <nav style={{ flex:1, padding:"16px 12px", display:"flex", flexDirection:"column", gap:4 }}>
          {NAV.map(n => (
            <button key={n.key} onClick={() => setPage(n.key)}
              style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 12px", borderRadius:8, border:"none", background: page===n.key ? "#2d2260" : "transparent", color: page===n.key ? "#ede9fd" : "#9a9690", fontSize:13, fontWeight: page===n.key ? 600 : 400, textAlign:"left", cursor:"pointer", transition:"all 0.15s" }}>
              <span style={{ fontSize:15 }}>{n.icon}</span>{n.label}
            </button>
          ))}
        </nav>
        <div style={{ padding:"0 12px" }}>
          <div style={{ fontSize:12, color:"#6b6860", padding:"0 12px", marginBottom:8 }}>👤 {user?.name}</div>
          <button onClick={logout}
            style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #2c2924", background:"transparent", color:"#9a9690", fontSize:12, cursor:"pointer" }}>
            Sign out
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ overflowY:"auto", padding:28 }}>
        {pages[page]}
      </div>
    </div>
  );
}