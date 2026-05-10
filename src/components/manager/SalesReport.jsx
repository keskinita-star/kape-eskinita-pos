import { useState, useEffect } from "react";
import { getOrders } from "../../services/orderService";
import { formatCurrency, formatDate, formatDateTime } from "../../utils/formatters";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ["#1a1814","#4a3d8f","#b45309","#166534","#0369a1","#dc2626"];

export default function SalesReport() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(7);
  const [aiInsight, setAiInsight] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => { getOrders().then(o => { setOrders(o); setLoading(false); }); }, []);

  const cutoff = Date.now() - range * 24 * 60 * 60 * 1000;
  const filtered = orders.filter(o => o.createdAt >= cutoff);
  const totalSales = filtered.reduce((s, o) => s + o.total, 0);
  const avgOrder = filtered.length ? totalSales / filtered.length : 0;

  // Daily sales chart
  const dailyData = Array.from({ length: range }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (range-1-i)); d.setHours(0,0,0,0);
    const next = new Date(d); next.setDate(next.getDate()+1);
    const daySales = filtered.filter(o => o.createdAt >= d.getTime() && o.createdAt < next.getTime()).reduce((s,o) => s+o.total, 0);
    const dayOrders = filtered.filter(o => o.createdAt >= d.getTime() && o.createdAt < next.getTime()).length;
    return { date: d.toLocaleDateString("en-PH",{month:"short",day:"numeric"}), sales: Math.round(daySales), orders: dayOrders };
  });

  // Top products
  const topItems = Object.values(
    filtered.flatMap(o => o.items||[]).reduce((acc, item) => {
      if (!acc[item.name]) acc[item.name] = { name:item.name, qty:0, revenue:0 };
      acc[item.name].qty += item.qty;
      acc[item.name].revenue += item.price * item.qty;
      return acc;
    }, {})
  ).sort((a,b) => b.revenue - a.revenue).slice(0,6);

  // Payment method breakdown
  const paymentBreakdown = filtered.reduce((acc, o) => {
    const m = o.payment?.method || "Unknown";
    if (!acc[m]) acc[m] = { name:m, value:0, count:0 };
    acc[m].value += o.total;
    acc[m].count++;
    return acc;
  }, {});
  const paymentData = Object.values(paymentBreakdown);

  // Sales by hour
  const hourlyData = Array.from({ length: 24 }, (_, h) => {
    const sales = filtered.filter(o => new Date(o.createdAt).getHours() === h).reduce((s,o) => s+o.total, 0);
    return { hour: `${h}:00`, sales: Math.round(sales) };
  }).filter(h => h.sales > 0);

  const getAiInsight = async () => {
    setAiLoading(true); setAiInsight("");
    const summary = {
      period: `Last ${range} days`,
      totalSales: formatCurrency(totalSales),
      totalOrders: filtered.length,
      avgOrderValue: formatCurrency(avgOrder),
      topProducts: topItems.map(i => `${i.name} (qty:${i.qty}, revenue:${formatCurrency(i.revenue)})`),
      paymentMethods: paymentData.map(p => `${p.name}: ${p.count} orders, ${formatCurrency(p.value)}`),
      dailyTrend: dailyData.map(d => `${d.date}: ${formatCurrency(d.sales)} (${d.orders} orders)`),
    };
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514",
          max_tokens:1000,
          system:"You are a business analyst for Kape Eskinita, a Filipino coffee shop. Analyze sales data and give 4-5 concise, actionable bullet points. Focus on trends, best sellers, peak hours, and growth opportunities. Be specific and practical for a small coffee shop owner.",
          messages:[{ role:"user", content:`Analyze this sales data:\n${JSON.stringify(summary,null,2)}` }]
        })
      });
      const data = await res.json();
      setAiInsight(data.content?.[0]?.text || "No insight returned.");
    } catch { setAiInsight("Failed to get AI insights. Please try again."); }
    finally { setAiLoading(false); }
  };

  if (loading) return <p style={{ fontSize:13, color:"#9a9690" }}>Loading...</p>;

  const card = (label, value, sub) => (
    <div style={{ background:"#fff", border:"1px solid #e8e2d9", borderRadius:12, padding:"16px 20px" }}>
      <div style={{ fontSize:11, color:"#9a9690", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:22, fontWeight:700, color:"#1a1814", letterSpacing:"-0.5px" }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:"#9a9690", marginTop:4 }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <h2 style={{ fontSize:20, fontWeight:700, color:"#1a1814", letterSpacing:"-0.5px" }}>Sales Report</h2>
          <p style={{ fontSize:13, color:"#9a9690", marginTop:2 }}>{filtered.length} orders in the last {range} days</p>
        </div>
        <div style={{ display:"flex", gap:6 }}>
          {[7,14,30].map(r => (
            <button key={r} onClick={() => setRange(r)}
              style={{ padding:"6px 14px", borderRadius:20, fontSize:12, fontWeight:500, border: range===r ? "1px solid #1a1814" : "1px solid #e8e2d9", background: range===r ? "#1a1814" : "transparent", color: range===r ? "#fff" : "#6b6860", cursor:"pointer" }}>
              {r}d
            </button>
          ))}
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:12 }}>
        {card("Total Sales", formatCurrency(totalSales))}
        {card("Total Orders", filtered.length)}
        {card("Avg Order Value", formatCurrency(avgOrder))}
        {card("Top Product", topItems[0]?.name || "—", topItems[0] ? `${topItems[0].qty} sold` : "")}
      </div>

      {/* Daily Sales Bar Chart */}
      <div style={{ background:"#fff", border:"1px solid #e8e2d9", borderRadius:12, padding:20 }}>
        <div style={{ fontSize:14, fontWeight:600, color:"#1a1814", marginBottom:16 }}>Daily Sales</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={dailyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0ede8" />
            <XAxis dataKey="date" tick={{ fontSize:11, fill:"#9a9690" }} />
            <YAxis tick={{ fontSize:11, fill:"#9a9690" }} tickFormatter={v => `₱${v}`} />
            <Tooltip formatter={v => formatCurrency(v)} contentStyle={{ fontSize:12, borderRadius:8, border:"1px solid #e8e2d9" }} />
            <Bar dataKey="sales" fill="#1a1814" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Order Count Trend */}
      <div style={{ background:"#fff", border:"1px solid #e8e2d9", borderRadius:12, padding:20 }}>
        <div style={{ fontSize:14, fontWeight:600, color:"#1a1814", marginBottom:16 }}>Order Volume Trend</div>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={dailyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0ede8" />
            <XAxis dataKey="date" tick={{ fontSize:11, fill:"#9a9690" }} />
            <YAxis tick={{ fontSize:11, fill:"#9a9690" }} />
            <Tooltip contentStyle={{ fontSize:12, borderRadius:8, border:"1px solid #e8e2d9" }} />
            <Line type="monotone" dataKey="orders" stroke="#4a3d8f" strokeWidth={2} dot={{ r:3, fill:"#4a3d8f" }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top Products + Payment Methods */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        {/* Top Products */}
        <div style={{ background:"#fff", border:"1px solid #e8e2d9", borderRadius:12, padding:20 }}>
          <div style={{ fontSize:14, fontWeight:600, color:"#1a1814", marginBottom:14 }}>Top Products</div>
          {topItems.length === 0 ? <p style={{ fontSize:13, color:"#9a9690" }}>No data yet.</p> :
            topItems.map((item, i) => (
              <div key={item.name} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:"1px solid #f5f3ee" }}>
                <span style={{ fontSize:11, color:"#9a9690", minWidth:18, fontWeight:600 }}>#{i+1}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:"#1a1814" }}>{item.name}</div>
                  <div style={{ fontSize:11, color:"#9a9690" }}>{item.qty} sold</div>
                </div>
                <span style={{ fontSize:12, fontWeight:700, color:"#1a1814" }}>{formatCurrency(item.revenue)}</span>
              </div>
            ))
          }
        </div>

        {/* Payment Methods Pie */}
        <div style={{ background:"#fff", border:"1px solid #e8e2d9", borderRadius:12, padding:20 }}>
          <div style={{ fontSize:14, fontWeight:600, color:"#1a1814", marginBottom:14 }}>Payment Methods</div>
          {paymentData.length === 0 ? <p style={{ fontSize:13, color:"#9a9690" }}>No data yet.</p> : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={paymentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                  {paymentData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={v => formatCurrency(v)} contentStyle={{ fontSize:12, borderRadius:8 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* AI Insights */}
      <div style={{ background:"#fff", border:"1px solid #e8e2d9", borderRadius:12, padding:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <div>
            <div style={{ fontSize:14, fontWeight:600, color:"#1a1814" }}>✨ AI Business Insights</div>
            <div style={{ fontSize:11, color:"#9a9690", marginTop:2 }}>Powered by Claude AI</div>
          </div>
          <button onClick={getAiInsight} disabled={aiLoading}
            style={{ padding:"8px 16px", borderRadius:8, background: aiLoading ? "#d0ccc4" : "#1a1814", color: aiLoading ? "#9a9690" : "#fff", border:"none", fontSize:12, fontWeight:600, cursor: aiLoading ? "not-allowed" : "pointer" }}>
            {aiLoading ? "Analyzing..." : "Generate Insights"}
          </button>
        </div>
        {aiInsight
          ? <div style={{ fontSize:13, color:"#1a1814", lineHeight:1.8, whiteSpace:"pre-wrap" }}>{aiInsight}</div>
          : <p style={{ fontSize:13, color:"#9a9690" }}>Click "Generate Insights" to get AI-powered analysis of your sales data.</p>
        }
      </div>
    </div>
  );
}