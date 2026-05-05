import { useState, useEffect } from "react";
import { getOrders } from "../../services/orderService";
import { getProducts } from "../../services/productService";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { LOW_STOCK_THRESHOLD } from "../../utils/constants";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function Overview() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getOrders(), getProducts()]).then(([o, p]) => {
      setOrders(o); setProducts(p); setLoading(false);
    });
  }, []);

  if (loading) return <p style={{ color:"#9a9690", fontSize:13 }}>Loading...</p>;

  const today = new Date(); today.setHours(0,0,0,0);
  const todayOrders = orders.filter(o => o.createdAt >= today.getTime());
  const todaySales = todayOrders.reduce((s, o) => s + o.total, 0);
  const lowStock = products.filter(p => p.stock <= LOW_STOCK_THRESHOLD && p.stock > 0);
  const outOfStock = products.filter(p => p.stock <= 0);

  // Sales trend last 7 days
  const trendData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i)); d.setHours(0,0,0,0);
    const next = new Date(d); next.setDate(next.getDate() + 1);
    const sales = orders.filter(o => o.createdAt >= d.getTime() && o.createdAt < next.getTime()).reduce((s, o) => s + o.total, 0);
    return { date: d.toLocaleDateString("en-PH", { month:"short", day:"numeric" }), sales: Math.round(sales) };
  });

  const statCard = (label, value, sub, color="#1a1814") => (
    <div style={{ background:"#fff", border:"0.5px solid #e0ddd5", borderRadius:12, padding:"16px 20px" }}>
      <div style={{ fontSize:12, color:"#9a9690", marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:24, fontWeight:600, color, letterSpacing:"-0.5px" }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:"#9a9690", marginTop:4 }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <h2 style={{ fontSize:18, fontWeight:600, color:"#1a1814", letterSpacing:"-0.3px" }}>Overview</h2>

      {/* Stat Cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))", gap:12 }}>
        {statCard("Today's Sales", formatCurrency(todaySales), `${todayOrders.length} orders`)}
        {statCard("Total Orders", orders.length, "All time")}
        {statCard("Low Stock Items", lowStock.length, "Need restocking", lowStock.length > 0 ? "#b45309" : "#1a1814")}
        {statCard("Out of Stock", outOfStock.length, "Items", outOfStock.length > 0 ? "#dc2626" : "#1a1814")}
      </div>

      {/* Low Stock Alerts */}
      {(lowStock.length > 0 || outOfStock.length > 0) && (
        <div style={{ background:"#fff7ed", border:"0.5px solid #fed7aa", borderRadius:12, padding:"14px 18px" }}>
          <div style={{ fontSize:13, fontWeight:600, color:"#b45309", marginBottom:10 }}>⚠️ Stock Alerts</div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {[...outOfStock.map(p => ({ ...p, alert:"out" })), ...lowStock.map(p => ({ ...p, alert:"low" }))].map(p => (
              <div key={p.id} style={{ display:"flex", justifyContent:"space-between", fontSize:12 }}>
                <span style={{ color:"#1a1814" }}>{p.name}</span>
                <span style={{ color: p.alert==="out" ? "#dc2626" : "#b45309", fontWeight:500 }}>
                  {p.alert==="out" ? "Out of stock" : `${p.stock} left`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sales Trend Chart */}
      <div style={{ background:"#fff", border:"0.5px solid #e0ddd5", borderRadius:12, padding:"20px" }}>
        <div style={{ fontSize:14, fontWeight:600, color:"#1a1814", marginBottom:16 }}>Sales trend — last 7 days</div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0ede8" />
            <XAxis dataKey="date" tick={{ fontSize:11, fill:"#9a9690" }} />
            <YAxis tick={{ fontSize:11, fill:"#9a9690" }} tickFormatter={v => `₱${v}`} />
            <Tooltip formatter={v => formatCurrency(v)} labelStyle={{ fontSize:12 }} contentStyle={{ fontSize:12, borderRadius:8, border:"0.5px solid #e0ddd5" }} />
            <Line type="monotone" dataKey="sales" stroke="#2d2260" strokeWidth={2} dot={{ r:3, fill:"#2d2260" }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Orders */}
      <div style={{ background:"#fff", border:"0.5px solid #e0ddd5", borderRadius:12, padding:"20px" }}>
        <div style={{ fontSize:14, fontWeight:600, color:"#1a1814", marginBottom:14 }}>Recent orders</div>
        {orders.length === 0 ? <p style={{ fontSize:13, color:"#9a9690" }}>No orders yet.</p> :
          [...orders].sort((a,b) => b.createdAt - a.createdAt).slice(0,5).map(o => (
            <div key={o.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:"0.5px solid #f0ede8", fontSize:13 }}>
              <div>
                <div style={{ fontWeight:500, color:"#1a1814" }}>{o.cashierName}</div>
                <div style={{ fontSize:11, color:"#9a9690" }}>{formatDate(o.createdAt)} · {o.items?.length} item(s)</div>
              </div>
              <div style={{ fontWeight:600, color:"#2d2260" }}>{formatCurrency(o.total)}</div>
            </div>
          ))
        }
      </div>
    </div>
  );
}