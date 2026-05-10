// src/components/admin/AdminDashboard.jsx
import { useState, Component } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Overview from "./Overview";
import ProductsManagement from "./ProductsManagement";
import OrdersManagement from "./OrdersManagement";
import SalesReport from "./SalesReport";
import UsersManagement from "./UsersManagement";
import InventoryManagement from "./InventoryManagement";

const NAV = [
  { key: "overview",  label: "Overview",      icon: "📊" },
  { key: "products",  label: "Products",      icon: "📦" },
  { key: "orders",    label: "Orders",        icon: "🧾" },
  { key: "inventory", label: "Inventory",     icon: "🗃️" },
  { key: "sales",     label: "Sales Report",  icon: "📈" },
  { key: "users",     label: "Users",         icon: "👥" },
  { key: "customer",  label: "Customer App",  icon: "📱" }, // new
];

class PageErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidUpdate(prevProps) {
    if (prevProps.page !== this.props.page) this.setState({ error: null });
  }
  render() {
    if (this.state.error) return (
      <div style={{ padding: 32, color: "#c0392b", fontSize: 13, lineHeight: 1.7 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Something went wrong on this page.</div>
        <pre style={{ background: "#fff0ee", padding: 12, borderRadius: 8, overflowX: "auto", fontSize: 11 }}>
          {this.state.error.message}
        </pre>
      </div>
    );
    return this.props.children;
  }
}

function ActivePage({ page }) {
  switch (page) {
    case "overview":  return <Overview />;
    case "products":  return <ProductsManagement />;
    case "orders":    return <OrdersManagement />;
    case "inventory": return <InventoryManagement />;
    case "sales":     return <SalesReport />;
    case "users":     return <UsersManagement />;
    case "customer":  return <CustomerAppView />;
    default:          return <Overview />;
  }
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [page, setPage] = useState("overview");

  return (
    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", height: "100vh", background: "#f5f3ee" }}>
      <div style={{ background: "#1a1814", display: "flex", flexDirection: "column", padding: "24px 0" }}>
        <div style={{ padding: "0 20px 24px", borderBottom: "0.5px solid #2c2924" }}>
          <div style={{ fontSize: 20 }}>☕</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#f5f3ee", marginTop: 6 }}>Kape Eskinita</div>
          <div style={{ fontSize: 11, color: "#6b6860", marginTop: 2 }}>Admin Panel</div>
        </div>
        <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
          {NAV.map(n => (
            <button key={n.key} onClick={() => setPage(n.key)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, border: "none", background: page === n.key ? "#2d2260" : "transparent", color: page === n.key ? "#ede9fd" : "#9a9690", fontSize: 13, fontWeight: page === n.key ? 600 : 400, textAlign: "left", transition: "all 0.15s" }}>
              <span style={{ fontSize: 15 }}>{n.icon}</span>{n.label}
            </button>
          ))}
        </nav>
        <div style={{ padding: "0 12px" }}>
          <div style={{ fontSize: 12, color: "#6b6860", padding: "0 12px", marginBottom: 8 }}>👤 {user?.name}</div>
          <button onClick={logout} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "0.5px solid #2c2924", background: "transparent", color: "#9a9690", fontSize: 12 }}>Sign out</button>
        </div>
      </div>
      <div style={{ overflowY: "auto", padding: 24 }}>
        <PageErrorBoundary page={page}>
          <ActivePage page={page} />
        </PageErrorBoundary>
      </div>
    </div>
  );
}