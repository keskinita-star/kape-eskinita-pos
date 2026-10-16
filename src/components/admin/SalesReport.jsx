// src/components/admin/SalesReport.jsx
import { useState, useEffect, useMemo } from "react";
import { ref, get } from "firebase/database";
import { rtdb } from "../../services/firebase";

// ---- Adjust these to match your Realtime Database schema ------------------
const ORDERS_PATH = "orders"; // path under the RTDB root holding order records

// Order records are expected to look roughly like:
// {
//   total: 180,                 // order total in pesos (falls back to sum of items if missing)
//   status: "completed",        // optional — orders with these statuses are excluded by default
//   createdAt: 1718000000000,    // timestamp in ms, ISO string, or Date
//   items: [{ name: "Spanish Latte", price: 90, quantity: 2 }, ...]
// }
const EXCLUDED_STATUSES = ["cancelled", "pending"];
// -----------------------------------------------------------------------------

const RANGES = ["week", "month", "year", "custom"];

function peso(n) {
  return `₱${Math.round(n).toLocaleString("en-PH")}`;
}

function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate(); // Firestore Timestamp
  if (value instanceof Date) return value;
  return new Date(value);
}

function getOrderTotal(order) {
  if (typeof order.total === "number") return order.total;
  if (typeof order.totalAmount === "number") return order.totalAmount;
  return (order.items || []).reduce(
    (sum, item) => sum + (item.price || 0) * (item.quantity || item.qty || 1),
    0
  );
}

function getOrderQty(order) {
  return (order.items || []).reduce((s, i) => s + (i.quantity || i.qty || 1), 0);
}

function isoDateInput(d) {
  // yyyy-mm-dd for <input type="date">
  return d.toISOString().slice(0, 10);
}

// Builds the date buckets used for the trend chart and for defining the
// "current period" vs "previous period" used in the delta comparison.
function buildBuckets(range, now, custom) {
  if (range === "week") {
    return Array.from({ length: 7 }, (_, i) => {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - (6 - i));
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      return { label: start.toLocaleDateString("en-US", { weekday: "short" }), start, end };
    });
  }
  if (range === "month") {
    const end0 = new Date(now);
    end0.setHours(0, 0, 0, 0);
    end0.setDate(end0.getDate() + 1);
    return Array.from({ length: 4 }, (_, i) => {
      const end = new Date(end0);
      end.setDate(end.getDate() - (3 - i) * 7);
      const start = new Date(end);
      start.setDate(start.getDate() - 7);
      return { label: `Wk ${i + 1}`, start, end };
    });
  }
  if (range === "custom" && custom?.start && custom?.end) {
    const start0 = new Date(custom.start);
    start0.setHours(0, 0, 0, 0);
    const end0 = new Date(custom.end);
    end0.setHours(0, 0, 0, 0);
    end0.setDate(end0.getDate() + 1); // inclusive of the end date

    const totalDays = Math.max(1, Math.round((end0 - start0) / 86400000));

    if (totalDays <= 31) {
      // one bucket per day
      return Array.from({ length: totalDays }, (_, i) => {
        const start = new Date(start0);
        start.setDate(start.getDate() + i);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        return {
          label: start.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          start,
          end,
        };
      });
    }
    // longer ranges — bucket by week
    const totalWeeks = Math.ceil(totalDays / 7);
    return Array.from({ length: totalWeeks }, (_, i) => {
      const start = new Date(start0);
      start.setDate(start.getDate() + i * 7);
      let end = new Date(start);
      end.setDate(end.getDate() + 7);
      if (end > end0) end = end0;
      return {
        label: start.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        start,
        end,
      };
    });
  }
  // year — 12 calendar months ending with the current one
  return Array.from({ length: 12 }, (_, i) => {
    const start = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    const end = new Date(now.getFullYear(), now.getMonth() - (11 - i) + 1, 1);
    return { label: start.toLocaleDateString("en-US", { month: "short" }), start, end };
  });
}

function ordersToCSV(orders) {
  const header = ["Order ID", "Date", "Items", "Quantity", "Total", "Status"];
  const escape = (val) => `"${String(val).replace(/"/g, '""')}"`;

  const rows = orders.map((o) => {
    const itemsSummary = (Array.isArray(o.items) ? o.items : [])
      .map((i) => `${i.name || i.productName || "Unknown"} x${i.quantity || i.qty || 1}`)
      .join("; ");
    return [
      escape(o.id),
      escape(o.createdAt ? o.createdAt.toISOString() : ""),
      escape(itemsSummary),
      getOrderQty(o),
      getOrderTotal(o).toFixed(2),
      escape(o.status || "completed"),
    ].join(",");
  });

  return [header.join(","), ...rows].join("\n");
}

function downloadCSV(filename, csvContent) {
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" }); // BOM for Excel
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function StatCard({ label, value, delta, deltaLabel, sub }) {
  const hasDelta = delta !== null && delta !== undefined;
  const positive = hasDelta && delta >= 0;
  return (
    <div style={{ background: "#fff", border: "1px solid #e8e4dc", borderRadius: 12, padding: "16px 18px" }}>
      <div style={{ fontSize: 12, color: "#8a8580", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: "#1a1814", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {value}
      </div>
      {hasDelta && (
        <div style={{ fontSize: 12, marginTop: 6, color: positive ? "#3a8c5f" : "#c0392b", fontWeight: 600 }}>
          {positive ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%{" "}
          <span style={{ color: "#a8a39c", fontWeight: 400 }}>{deltaLabel}</span>
        </div>
      )}
      {sub && <div style={{ fontSize: 12, marginTop: 6, color: "#a8a39c" }}>{sub}</div>}
    </div>
  );
}

const statusColors = {
  completed: { bg: "#e9f5ee", fg: "#3a8c5f" },
  cancelled: { bg: "#fbeaea", fg: "#c0392b" },
  pending: { bg: "#fdf3e3", fg: "#b9852f" },
};

function StatusBadge({ status }) {
  const s = (status || "completed").toLowerCase();
  const c = statusColors[s] || { bg: "#f0ece3", fg: "#6b665f" };
  return (
    <span
      style={{
        background: c.bg,
        color: c.fg,
        fontSize: 11,
        fontWeight: 600,
        padding: "3px 9px",
        borderRadius: 999,
        textTransform: "capitalize",
        whiteSpace: "nowrap",
      }}
    >
      {status || "completed"}
    </span>
  );
}

const PAGE_SIZE = 25;

export default function SalesReport() {
  const [range, setRange] = useState("week");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Custom date range
  const today = new Date();
  const monthAgo = new Date(today);
  monthAgo.setDate(monthAgo.getDate() - 29);
  const [customStart, setCustomStart] = useState(isoDateInput(monthAgo));
  const [customEnd, setCustomEnd] = useState(isoDateInput(today));

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    get(ref(rtdb, ORDERS_PATH))
      .then((snap) => {
        if (!active) return;
        const val = snap.val() || {};
        const rows = Object.entries(val).map(([id, data]) => ({
          id,
          ...data,
          createdAt: toDate(data.createdAt),
        }));
        setOrders(rows);
      })
      .catch((err) => {
        if (active) setError(err.message || "Failed to load orders.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Every status actually present in the data, for the filter dropdown
  const availableStatuses = useMemo(() => {
    const set = new Set();
    orders.forEach((o) => set.add((o.status || "completed").toLowerCase()));
    return Array.from(set).sort();
  }, [orders]);

  // Reset pagination whenever the active filters change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [range, statusFilter, search, customStart, customEnd]);

  const stats = useMemo(() => {
    const now = new Date();
    const buckets = buildBuckets(range, now, { start: customStart, end: customEnd });
    const periodStart = buckets[0].start;
    const periodEnd = buckets[buckets.length - 1].end;
    const periodMs = periodEnd - periodStart;
    const prevStart = new Date(periodStart.getTime() - periodMs);
    const prevEnd = periodStart;

    const matchesStatus = (o) => {
      const s = (o.status || "completed").toLowerCase();
      if (statusFilter !== "all") return s === statusFilter;
      return !EXCLUDED_STATUSES.includes(s); // default view: exclude cancelled/pending
    };
    const matchesSearch = (o) => {
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      if (o.id?.toLowerCase().includes(q)) return true;
      return (o.items || []).some((i) =>
        (i.name || i.productName || "").toLowerCase().includes(q)
      );
    };
    const isCounted = (o) => o.createdAt && matchesStatus(o) && matchesSearch(o);

    const currentOrders = orders
      .filter((o) => isCounted(o) && o.createdAt >= periodStart && o.createdAt < periodEnd)
      .sort((a, b) => b.createdAt - a.createdAt);
    const previousOrders = orders.filter(
      (o) => isCounted(o) && o.createdAt >= prevStart && o.createdAt < prevEnd
    );

    const totalRevenue = currentOrders.reduce((s, o) => s + getOrderTotal(o), 0);
    const prevRevenue = previousOrders.reduce((s, o) => s + getOrderTotal(o), 0);
    const delta = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : null;

    const totalOrders = currentOrders.length;
    const avgOrder = totalOrders ? totalRevenue / totalOrders : 0;

    const chart = buckets.map((b) => ({
      label: b.label,
      value: currentOrders
        .filter((o) => o.createdAt >= b.start && o.createdAt < b.end)
        .reduce((s, o) => s + getOrderTotal(o), 0),
    }));

    const productMap = {};
    currentOrders.forEach((o) => {
      (Array.isArray(o.items) ? o.items : []).forEach((item) => {
        const name = item.name || item.productName || "Unknown item";
        const qty = item.quantity || item.qty || 1;
        const lineRevenue = item.subtotal ?? (item.price || 0) * qty;
        if (!productMap[name]) productMap[name] = { name, qty: 0, revenue: 0 };
        productMap[name].qty += qty;
        productMap[name].revenue += lineRevenue;
      });
    });
    const topProducts = Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const labels = {
      week: ["this week", "last week"],
      month: ["this month", "last month"],
      year: ["this year", "last year"],
      custom: ["selected period", "previous equivalent period"],
    };
    const [label, prevLabel] = labels[range];

    return { label, prevLabel, totalRevenue, totalOrders, avgOrder, delta, chart, topProducts, currentOrders };
  }, [orders, range, customStart, customEnd, statusFilter, search]);

  if (loading) {
    return <div style={{ padding: 40, color: "#8a8580", fontSize: 13 }}>Loading sales data…</div>;
  }
  if (error) {
    return (
      <div style={{ padding: 24, color: "#c0392b", fontSize: 13 }}>
        Couldn't load sales data: {error}
      </div>
    );
  }

  const maxChart = Math.max(1, ...stats.chart.map((d) => d.value));
  const maxTopRevenue = Math.max(1, ...stats.topProducts.map((p) => p.revenue));
  const topSeller = stats.topProducts[0];
  const visibleOrders = stats.currentOrders.slice(0, visibleCount);

  const handleExport = () => {
    const filenameRange = range === "custom" ? `${customStart}_to_${customEnd}` : range;
    const csv = ordersToCSV(stats.currentOrders);
    downloadCSV(`sales-${filenameRange}-${isoDateInput(new Date())}.csv`, csv);
  };

  const inputStyle = {
    border: "1px solid #e8e4dc",
    borderRadius: 8,
    padding: "7px 10px",
    fontSize: 13,
    color: "#1a1814",
    background: "#fff",
    outline: "none",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1a1814", margin: 0 }}>Sales Report</h1>
          <div style={{ fontSize: 13, color: "#8a8580", marginTop: 4 }}>
            Based on {orders.length.toLocaleString()} order{orders.length === 1 ? "" : "s"} · showing {stats.label}
            {statusFilter !== "all" && <> · status: {statusFilter}</>}
            {search.trim() && <> · search: "{search.trim()}"</>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, background: "#fff", border: "1px solid #e8e4dc", borderRadius: 10, padding: 4 }}>
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              style={{
                padding: "7px 16px",
                borderRadius: 8,
                border: "none",
                background: range === r ? "#2d2260" : "transparent",
                color: range === r ? "#ede9fd" : "#8a8580",
                fontSize: 13,
                fontWeight: range === r ? 600 : 500,
                cursor: "pointer",
                textTransform: "capitalize",
                transition: "all 0.15s",
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Custom date range inputs */}
      {range === "custom" && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <label style={{ fontSize: 12, color: "#8a8580" }}>
            From{" "}
            <input
              type="date"
              value={customStart}
              max={customEnd}
              onChange={(e) => setCustomStart(e.target.value)}
              style={{ ...inputStyle, marginLeft: 6 }}
            />
          </label>
          <label style={{ fontSize: 12, color: "#8a8580" }}>
            To{" "}
            <input
              type="date"
              value={customEnd}
              min={customStart}
              max={isoDateInput(new Date())}
              onChange={(e) => setCustomEnd(e.target.value)}
              style={{ ...inputStyle, marginLeft: 6 }}
            />
          </label>
        </div>
      )}

      {/* Filters + export */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Search order ID or product…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, flex: "1 1 220px", minWidth: 180 }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ ...inputStyle, textTransform: "capitalize" }}
        >
          <option value="all">All statuses (excl. cancelled/pending)</option>
          {availableStatuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          onClick={handleExport}
          disabled={stats.currentOrders.length === 0}
          style={{
            marginLeft: "auto",
            padding: "8px 16px",
            borderRadius: 8,
            border: "1px solid #2d2260",
            background: "#2d2260",
            color: "#ede9fd",
            fontSize: 13,
            fontWeight: 600,
            cursor: stats.currentOrders.length === 0 ? "not-allowed" : "pointer",
            opacity: stats.currentOrders.length === 0 ? 0.5 : 1,
            whiteSpace: "nowrap",
          }}
        >
          ⬇ Export CSV ({stats.currentOrders.length})
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
        <StatCard label="Total Revenue" value={peso(stats.totalRevenue)} delta={stats.delta} deltaLabel={`vs ${stats.prevLabel}`} />
        <StatCard label="Total Orders" value={stats.totalOrders.toLocaleString()} />
        <StatCard label="Avg. Order Value" value={peso(stats.avgOrder)} />
        <StatCard
          label="Top Seller"
          value={topSeller ? topSeller.name : "—"}
          sub={topSeller ? `${topSeller.qty} sold` : "No item data yet"}
        />
      </div>

      {/* Chart + Top products */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16, alignItems: "stretch" }}>
        <div style={{ background: "#fff", border: "1px solid #e8e4dc", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1814", marginBottom: 16 }}>Revenue Trend</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 180, overflowX: "auto" }}>
            {stats.chart.map((d, i) => (
              <div key={`${d.label}-${i}`} style={{ flex: "1 0 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, height: "100%", justifyContent: "flex-end" }}>
                <div
                  title={peso(d.value)}
                  style={{
                    width: "100%",
                    maxWidth: 36,
                    borderRadius: "6px 6px 0 0",
                    background: "linear-gradient(180deg, #4a3a8c, #2d2260)",
                    height: `${(d.value / maxChart) * 100}%`,
                    minHeight: 4,
                    transition: "height 0.3s",
                  }}
                />
                <div style={{ fontSize: 11, color: "#8a8580", whiteSpace: "nowrap" }}>{d.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: "#fff", border: "1px solid #e8e4dc", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1814", marginBottom: 16 }}>Top Products</div>
          {stats.topProducts.length === 0 ? (
            <div style={{ fontSize: 12, color: "#a8a39c" }}>
              No item-level data found for {stats.label}. Make sure orders include an <code>items</code> array.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {stats.topProducts.map((p, i) => (
                <div key={p.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                    <span style={{ color: "#1a1814", fontWeight: 500 }}>
                      {i + 1}. {p.name}
                    </span>
                    <span style={{ color: "#8a8580" }}>{peso(p.revenue)}</span>
                  </div>
                  <div style={{ height: 6, background: "#f0ece3", borderRadius: 4, overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${(p.revenue / maxTopRevenue) * 100}%`,
                        background: "#2d2260",
                        borderRadius: 4,
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 11, color: "#a8a39c", marginTop: 3 }}>{p.qty} sold</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Orders table */}
      <div style={{ background: "#fff", border: "1px solid #e8e4dc", borderRadius: 12, padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1814", marginBottom: 16 }}>
          Orders ({stats.currentOrders.length})
        </div>
        {stats.currentOrders.length === 0 ? (
          <div style={{ fontSize: 12, color: "#a8a39c" }}>No orders match the current filters.</div>
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "#8a8580", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4 }}>
                    <th style={{ padding: "0 10px 10px 0", fontWeight: 600 }}>Order ID</th>
                    <th style={{ padding: "0 10px 10px 0", fontWeight: 600 }}>Date</th>
                    <th style={{ padding: "0 10px 10px 0", fontWeight: 600 }}>Items</th>
                    <th style={{ padding: "0 10px 10px 0", fontWeight: 600 }}>Qty</th>
                    <th style={{ padding: "0 10px 10px 0", fontWeight: 600, textAlign: "right" }}>Total</th>
                    <th style={{ padding: "0 0 10px 0", fontWeight: 600 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleOrders.map((o) => (
                    <tr key={o.id} style={{ borderTop: "1px solid #f0ece3" }}>
                      <td style={{ padding: "10px 10px 10px 0", color: "#1a1814", fontFamily: "monospace", fontSize: 12 }}>
                        {o.id}
                      </td>
                      <td style={{ padding: "10px 10px 10px 0", color: "#6b665f", whiteSpace: "nowrap" }}>
                        {o.createdAt
                          ? o.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                          : "—"}
                      </td>
                      <td style={{ padding: "10px 10px 10px 0", color: "#6b665f", maxWidth: 280 }}>
                        {(o.items || []).map((i) => i.name || i.productName || "Unknown").join(", ") || "—"}
                      </td>
                      <td style={{ padding: "10px 10px 10px 0", color: "#6b665f" }}>{getOrderQty(o)}</td>
                      <td style={{ padding: "10px 10px 10px 0", color: "#1a1814", fontWeight: 600, textAlign: "right" }}>
                        {peso(getOrderTotal(o))}
                      </td>
                      <td style={{ padding: "10px 0 10px 0" }}>
                        <StatusBadge status={o.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {visibleCount < stats.currentOrders.length && (
              <div style={{ textAlign: "center", marginTop: 16 }}>
                <button
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                  style={{
                    padding: "8px 18px",
                    borderRadius: 8,
                    border: "1px solid #e8e4dc",
                    background: "#fff",
                    color: "#2d2260",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Show more ({stats.currentOrders.length - visibleCount} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}