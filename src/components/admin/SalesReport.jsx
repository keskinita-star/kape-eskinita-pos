import { useState, useEffect } from "react";
import { getOrders } from "../../services/orderService";
import { formatCurrency } from "../../utils/formatters";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from "recharts";

export default function SalesReport() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(7);

  useEffect(() => {
    getOrders().then(o => {
      setOrders(o);
      setLoading(false);
    });
  }, []);

  // ---------------------------
  // FILTER BY RANGE
  // ---------------------------
  const cutoff = Date.now() - range * 24 * 60 * 60 * 1000;
  const filtered = orders.filter(o => o.createdAt >= cutoff);

  const totalSales = filtered.reduce((s, o) => s + o.total, 0);
  const avgOrder = filtered.length ? totalSales / filtered.length : 0;

  // ---------------------------
  // TOP PRODUCTS (RANGE)
  // ---------------------------
  const topItems = Object.values(
    filtered.flatMap(o => o.items || []).reduce((acc, item) => {
      if (!acc[item.name]) {
        acc[item.name] = { name: item.name, qty: 0, revenue: 0 };
      }
      acc[item.name].qty += item.qty;
      acc[item.name].revenue += item.price * item.qty;
      return acc;
    }, {})
  )
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // ---------------------------
  // DAILY CHART
  // ---------------------------
  const chartData = Array.from({ length: range }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (range - 1 - i));
    d.setHours(0, 0, 0, 0);

    const next = new Date(d);
    next.setDate(next.getDate() + 1);

    const sales = filtered
      .filter(o => o.createdAt >= d.getTime() && o.createdAt < next.getTime())
      .reduce((s, o) => s + o.total, 0);

    return {
      date: d.toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric"
      }),
      sales: Math.round(sales)
    };
  });

  // ---------------------------
  // TODAY / YESTERDAY LOGIC
  // ---------------------------
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  const todayOrders = orders.filter(
    o => o.createdAt >= startOfToday.getTime()
  );

  const yesterdayOrders = orders.filter(
    o =>
      o.createdAt >= startOfYesterday.getTime() &&
      o.createdAt < startOfToday.getTime()
  );

  const todaySales = todayOrders.reduce((s, o) => s + o.total, 0);
  const yesterdaySales = yesterdayOrders.reduce((s, o) => s + o.total, 0);

  const salesDiff = todaySales - yesterdaySales;
  const salesPct = yesterdaySales
    ? (salesDiff / yesterdaySales) * 100
    : 0;

  // ---------------------------
  // TOP PRODUCT TODAY
  // ---------------------------
  const topToday = Object.values(
    todayOrders.flatMap(o => o.items || []).reduce((acc, item) => {
      if (!acc[item.name]) acc[item.name] = { name: item.name, qty: 0 };
      acc[item.name].qty += item.qty;
      return acc;
    }, {})
  ).sort((a, b) => b.qty - a.qty)[0];

  // ---------------------------
  // PEAK HOUR
  // ---------------------------
  const hourMap = {};

  todayOrders.forEach(order => {
    const hour = new Date(order.createdAt).getHours();
    hourMap[hour] = (hourMap[hour] || 0) + order.total;
  });

  const peakHourEntry = Object.entries(hourMap).sort(
    (a, b) => b[1] - a[1]
  )[0];

  const formatHour = h => {
    const suffix = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;
    return `${hour12} ${suffix}`;
  };

  const peakHour = peakHourEntry
    ? formatHour(Number(peakHourEntry[0]))
    : null;

  // ---------------------------
  // LOADING STATE
  // ---------------------------
  if (loading) {
    return <p style={{ fontSize: 13, color: "#9a9690" }}>Loading...</p>;
  }

  // ---------------------------
  // UI
  // ---------------------------
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>Sales Report</h2>

        <div style={{ display: "flex", gap: 8 }}>
          {[7, 14, 30].map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              style={{
                padding: "5px 12px",
                borderRadius: 20,
                fontSize: 12,
                border: range === r ? "0.5px solid #2d2260" : "0.5px solid #d0ccc4",
                background: range === r ? "#2d2260" : "transparent",
                color: range === r ? "#fff" : "#6b6860"
              }}
            >
              {r}d
            </button>
          ))}
        </div>
      </div>

      {/* MAIN STATS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        <Stat label="Total Sales" value={formatCurrency(totalSales)} />
        <Stat label="Orders" value={filtered.length} />
        <Stat label="Avg Order" value={formatCurrency(avgOrder)} />
      </div>

      {/* NEW INSIGHTS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <Stat
          label="Top Product Today"
          value={topToday ? topToday.name : "No data"}
          sub={topToday ? `${topToday.qty} sold` : ""}
        />

        <Stat
          label="Sales vs Yesterday"
          value={formatCurrency(todaySales)}
          sub={`${salesDiff >= 0 ? "▲" : "▼"} ${formatCurrency(Math.abs(salesDiff))} (${salesPct.toFixed(1)}%)`}
          subColor={salesDiff >= 0 ? "#16a34a" : "#dc2626"}
        />

        <Stat
          label="Peak Hour Today"
          value={peakHour || "No data"}
        />
      </div>

      {/* CHART */}
      <div style={{ background: "#fff", border: "0.5px solid #e0ddd5", borderRadius: 12, padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
          Daily Sales
        </div>

        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0ede8" />
            <XAxis dataKey="date" />
            <YAxis tickFormatter={v => `₱${v}`} />
            <Tooltip formatter={v => formatCurrency(v)} />
            <Bar dataKey="sales" fill="#2d2260" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* TOP PRODUCTS */}
      <div style={{ background: "#fff", border: "0.5px solid #e0ddd5", borderRadius: 12, padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>
          Top Products
        </div>

        {topItems.length === 0 ? (
          <p>No data.</p>
        ) : (
          topItems.map((item, i) => (
            <div key={item.name} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
              <span>#{i + 1} {item.name}</span>
              <span>{item.qty} sold</span>
              <span>{formatCurrency(item.revenue)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ---------------------------
// REUSABLE STAT COMPONENT
// ---------------------------
function Stat({ label, value, sub, subColor }) {
  return (
    <div style={{ background: "#fff", border: "0.5px solid #e0ddd5", borderRadius: 12, padding: "16px 20px" }}>
      <div style={{ fontSize: 12, color: "#9a9690" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 600 }}>{value}</div>
      {sub && (
        <div style={{ fontSize: 12, color: subColor || "#6b6860" }}>
          {sub}
        </div>
      )}
    </div>
  );
}