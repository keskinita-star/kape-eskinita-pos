import { useState, useEffect } from "react";
import { getOrders } from "../../services/orderService";
import { formatCurrency, formatDate, formatTime } from "../../utils/formatters";

export default function OrdersManagement() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => { getOrders().then(o => { setOrders(o.sort((a,b) => b.createdAt - a.createdAt)); setLoading(false); }); }, []);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <h2 style={{ fontSize:18, fontWeight:600, color:"#1a1814", letterSpacing:"-0.3px" }}>Orders</h2>
      {loading ? <p style={{ fontSize:13, color:"#9a9690" }}>Loading...</p> :
        orders.length === 0 ? <p style={{ fontSize:13, color:"#9a9690" }}>No orders yet.</p> : (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {orders.map(o => (
            <div key={o.id} style={{ background:"#fff", border:"0.5px solid #e0ddd5", borderRadius:12, overflow:"hidden" }}>
              <div onClick={() => setExpanded(expanded===o.id ? null : o.id)}
                style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 16px", cursor:"pointer" }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:500, color:"#1a1814" }}>{o.cashierName}</div>
                  <div style={{ fontSize:11, color:"#9a9690" }}>{formatDate(o.createdAt)} · {formatTime(o.createdAt)} · {o.items?.length} item(s)</div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <span style={{ fontSize:14, fontWeight:600, color:"#2d2260" }}>{formatCurrency(o.total)}</span>
                  <span style={{ fontSize:12 }}>{expanded===o.id ? "▲" : "▼"}</span>
                </div>
              </div>
              {expanded === o.id && (
                <div style={{ borderTop:"0.5px solid #f0ede8", padding:"12px 16px", background:"#faf9f6" }}>
                  {o.items?.map((item, i) => (
                    <div key={i} style={{ display:"flex", justifyContent:"space-between", fontSize:12, padding:"4px 0", color:"#6b6860" }}>
                      <span>{item.name} × {item.qty}</span>
                      <span>{formatCurrency(item.price * item.qty)}</span>
                    </div>
                  ))}
                  <div style={{ borderTop:"0.5px solid #e0ddd5", marginTop:8, paddingTop:8, display:"flex", flexDirection:"column", gap:4 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#9a9690" }}><span>Subtotal</span><span>{formatCurrency(o.subtotal)}</span></div>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#9a9690" }}><span>Tax (12%)</span><span>{formatCurrency(o.tax)}</span></div>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, fontWeight:600, color:"#1a1814" }}><span>Total</span><span>{formatCurrency(o.total)}</span></div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}