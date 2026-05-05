import { useState, useEffect } from "react";
import { getOrders } from "../../services/orderService";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function SalesReport() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiInsight, setAiInsight] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [range, setRange] = useState(7);

  useEffect(() => { getOrders().then(o => { setOrders(o); setLoading(false); }); }, []);

  const cutoff = Date.now() - range * 24 * 60 * 60 * 1000;
  const filtered = orders.filter(o => o.createdAt >= cutoff);

  const totalSales = filtered.reduce((s, o) => s + o.total, 0);
  const avgOrder = filtered.length ? totalSales / filtered.length : 0;

  const topItems = Object.values(
    filtered.flatMap(o => o.items || []).reduce((acc, item) => {
      if (!acc[item.name]) acc[item.name] = { name:item.name, qty:0, revenue:0 };
      acc[item.name].qty += item.qty;
      acc[item.name].revenue += item.price * item.qty;
      return acc;
    }, {})
  ).sort((a,b) => b.revenue - a.revenue).slice(0,5);

  const chartData = Array.from({ length: range }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (range-1-i)); d.setHours(0,0,0,0);
    const next = new Date(d); next.setDate(next.getDate()+1);
    const sales = filtered.filter(o => o.createdAt >= d.getTime() && o.createdAt < next.getTime()).reduce((s,o) => s+o.total, 0);
    return { date: d.toLocaleDateString("en-PH", { month:"short", day:"numeric" }), sales: Math.round(sales) };
  });

  const getAiInsight = async () => {
    setAiLoading(true);
    setAiInsight("");
    const summary = {
      period: `Last ${range} days`,
      totalSales: formatCurrency(totalSales),
      totalOrders: filtered.length,
      avgOrderValue: formatCurrency(avgOrder),
      topProducts: topItems.map(i => `${i.name} (qty: ${i.qty}, revenue: ${formatCurrency(i.revenue)})`),
      dailySales: chartData.map(d => `${d.date}: ${formatCurrency(d.sales)}`),
    };
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514",
          max_tokens:1000,
          system:"You are a business analyst for a Filipino coffee shop called Kape Eskinita. Analyze sales data and give concise, actionable insights in 3-4 bullet points. Be specific and practical.",
          messages:[{ role:"user", content:`Analyze this sales data and give insights:\n${JSON.stringify(summary, null, 2)}` }]
        })
      });
      const data = await res.json();
      setAiInsight(data.content?.[0]?.text || "No insight returned.");
    } catch { setAiInsight("Failed to get AI insights. Please try again."); }
    finally { setAiLoading(false); }
  };

  if (loading) return <p style={{ fontSize:13, color:"#9a9690" }}>Loading...</p>;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <h2 style={{ fontSize:18, fontWeight:600, color:"#1a1814", letterSpacing:"-0.3px" }}>Sales Report</h2>
        <div style={{ display:"flex", gap:8 }}>
          {[7,14,30].map(r => (
            <button key={r} onClick={() => setRange(r)}
              style={{ padding:"5px 12px", borderRadius:20, fontSize:12, fontWeight:500, border: range===r ? "0.5px solid #2d2260" : "0.5px solid #d0ccc4", background: range===r ? "#2d2260" : "transparent", color: range===r ? "#ede9fd" : "#6b6860" }}>
              {r}d
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))", gap:12 }}>
        {[["Total Sales", formatCurrency(totalSales)], ["Orders", filtered.length], ["Avg Order", formatCurrency(avgOrder)]].map(([label, val]) => (
          <div key={label} style={{ background:"#fff", border:"0.5px solid #e0ddd5", borderRadius:12, padding:"16px 20px" }}>
            <div style={{ fontSize:12, color:"#9a9690", marginBottom:6 }}>{label}</div>
            <div style={{ fontSize:22, fontWeight:600, color:"#1a1814", letterSpacing:"-0.5px" }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{ background:"#fff", border:"0.5px solid #e0ddd5", borderRadius:12, padding:20 }}>
        <div style={{ fontSize:14, fontWeight:600, color:"#1a1814", marginBottom:16 }}>Daily sales</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0ede8" />
            <XAxis dataKey="date" tick={{ fontSize:11, fill:"#9a9690" }} />
            <YAxis tick={{ fontSize:11, fill:"#9a9690" }} tickFormatter={v => `₱${v}`} />
            <Tooltip formatter={v => formatCurrency(v)} contentStyle={{ fontSize:12, borderRadius:8, border:"0.5px solid #e0ddd5" }} />
            <Bar dataKey="sales" fill="#2d2260" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top Products */}
      <div style={{ background:"#fff", border:"0.5px solid #e0ddd5", borderRadius:12, padding:20 }}>
        <div style={{ fontSize:14, fontWeight:600, color:"#1a1814", marginBottom:14 }}>Top products</div>
        {topItems.length === 0 ? <p style={{ fontSize:13, color:"#9a9690" }}>No data.</p> :
          topItems.map((item, i) => (
            <div key={item.name} style={{ display:"flex", alignItems:"center", gap:12, padding:"8px 0", borderBottom:"0.5px solid #f0ede8" }}>
              <span style={{ fontSize:12, color:"#9a9690", minWidth:16 }}>#{i+1}</span>
              <span style={{ flex:1, fontSize:13, fontWeight:500, color:"#1a1814" }}>{item.name}</span>
              <span style={{ fontSize:12, color:"#6b6860" }}>{item.qty} sold</span>
              <span style={{ fontSize:13, fontWeight:600, color:"#2d2260" }}>{formatCurrency(item.revenue)}</span>
            </div>
          ))
        }
      </div>

      {/* AI Insights */}
      <div style={{ background:"#fff", border:"0.5px solid #e0ddd5", borderRadius:12, padding:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <div style={{ fontSize:14, fontWeight:600, color:"#1a1814" }}>✨ AI Insights</div>
          <button onClick={getAiInsight} disabled={aiLoading}
            style={{ padding:"7px 14px", borderRadius:8, background: aiLoading ? "#d0ccc4" : "#2d2260", color: aiLoading ? "#9a9690" : "#ede9fd", border:"none", fontSize:12, fontWeight:600 }}>
            {aiLoading ? "Analyzing..." : "Generate Insights"}
          </button>
        </div>
        {aiInsight ? (
          <div style={{ fontSize:13, color:"#1a1814", lineHeight:1.7, whiteSpace:"pre-wrap" }}>{aiInsight}</div>
        ) : (
          <p style={{ fontSize:13, color:"#9a9690" }}>Click "Generate Insights" to get AI-powered analysis of your sales data.</p>
        )}
      </div>
    </div>
  );
}