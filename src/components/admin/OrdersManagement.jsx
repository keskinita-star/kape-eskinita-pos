import { useState, useEffect } from "react";
import { subscribeToOrders, updateOrderStatus } from "../../services/orderService";
import { formatCurrency, formatDate, formatTime } from "../../utils/formatters";

const STATUS_FLOW = ["pending", "preparing", "ready", "completed"];

const STATUS_LABELS = {
  pending: "Pending",
  preparing: "Preparing",
  ready: "Ready for pickup",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_COLORS = {
  pending: { bg: "#fdf0e0", text: "#b8720a" },
  preparing: { bg: "#e8eefc", text: "#2d5bb8" },
  ready: { bg: "#e6f4ea", text: "#2f8a4e" },
  completed: { bg: "#eeece8", text: "#6b6860" },
  cancelled: { bg: "#fbe9e7", text: "#c0392b" },
};

const FILTERS = ["all", "pending", "preparing", "ready", "completed", "cancelled"];

function nextStatus(current) {
  const idx = STATUS_FLOW.indexOf(current);
  if (idx === -1 || idx === STATUS_FLOW.length - 1) return null;
  return STATUS_FLOW[idx + 1];
}

function StatusBadge({ status }) {
  const s = status || "completed";
  const colors = STATUS_COLORS[s] || STATUS_COLORS.completed;
  return (
    <span
      style={{
        fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 999,
        background: colors.bg, color: colors.text, whiteSpace: "nowrap",
      }}
    >
      {STATUS_LABELS[s] || s}
    </span>
  );
}

export default function OrdersManagement() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [filter, setFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribeToOrders((list) => {
      setOrders(list.sort((a, b) => b.createdAt - a.createdAt));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredOrders =
    filter === "all"
      ? orders
      : orders.filter((o) => (o.status || "completed") === filter);

  async function handleAdvance(order) {
    const next = nextStatus(order.status || "pending");
    if (!next) return;
    setUpdatingId(order.id);
    try {
      await updateOrderStatus(order.id, next);
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleCancel(order) {
    setUpdatingId(order.id);
    try {
      await updateOrderStatus(order.id, "cancelled");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: "#1a1814", letterSpacing: "-0.3px" }}>
        Orders
      </h2>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer",
              background: filter === f ? "#2d2260" : "#f0ede8",
              color: filter === f ? "#ede9fd" : "#6b6860",
              fontSize: 12, fontWeight: filter === f ? 600 : 500,
            }}
          >
            {f === "all" ? "All" : STATUS_LABELS[f]}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: "#9a9690" }}>Loading...</p>
      ) : filteredOrders.length === 0 ? (
        <p style={{ fontSize: 13, color: "#9a9690" }}>No orders here.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filteredOrders.map((o) => {
            const source = o.cashier ? "pos" : "customer";
            const status = o.status || "completed";
            const isActionable = source === "customer" && status !== "completed" && status !== "cancelled";
            const upcoming = nextStatus(status);

            return (
              <div key={o.id} style={{ background: "#fff", border: "0.5px solid #e0ddd5", borderRadius: 12, overflow: "hidden" }}>
                <div
                  onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", cursor: "pointer", gap: 12 }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: "#1a1814" }}>
                        {source === "pos" ? o.cashier?.name || "Cashier" : o.customerName || "Customer app order"}
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "#9a9690" }}>
                        {source === "pos" ? "· POS" : "· Customer App"}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: "#9a9690" }}>
                      {formatDate(o.createdAt)} · {formatTime(o.createdAt)} · {o.items?.length} item(s)
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                    <StatusBadge status={status} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#2d2260" }}>{formatCurrency(o.total)}</span>
                    <span style={{ fontSize: 12 }}>{expanded === o.id ? "▲" : "▼"}</span>
                  </div>
                </div>

                {expanded === o.id && (
                  <div style={{ borderTop: "0.5px solid #f0ede8", padding: "12px 16px", background: "#faf9f6" }}>
                    {o.items?.map((item, i) => {
                      const qty = item.qty ?? item.quantity ?? 0;
                      return (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "4px 0", color: "#6b6860" }}>
                          <span>{item.name} × {qty}</span>
                          <span>{formatCurrency(item.price * qty)}</span>
                        </div>
                      );
                    })}
                    <div style={{ borderTop: "0.5px solid #e0ddd5", marginTop: 8, paddingTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                      {o.subtotal != null && (
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#9a9690" }}>
                          <span>Subtotal</span><span>{formatCurrency(o.subtotal)}</span>
                        </div>
                      )}
                      {o.tax != null && (
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#9a9690" }}>
                          <span>Tax (12%)</span><span>{formatCurrency(o.tax)}</span>
                        </div>
                      )}
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600, color: "#1a1814" }}>
                        <span>Total</span><span>{formatCurrency(o.total)}</span>
                      </div>
                    </div>

                    {isActionable && (
                      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                        {upcoming && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleAdvance(o); }}
                            disabled={updatingId === o.id}
                            style={{
                              flex: 1, padding: "8px 0", borderRadius: 8, border: "none",
                              background: "#2d2260", color: "#ede9fd", fontSize: 12, fontWeight: 600,
                              cursor: updatingId === o.id ? "not-allowed" : "pointer",
                            }}
                          >
                            {updatingId === o.id ? "Updating…" : `Mark as ${STATUS_LABELS[upcoming]}`}
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleCancel(o); }}
                          disabled={updatingId === o.id}
                          style={{
                            padding: "8px 14px", borderRadius: 8, border: "1px solid #e0ddd5",
                            background: "transparent", color: "#c0392b", fontSize: 12, fontWeight: 600,
                            cursor: updatingId === o.id ? "not-allowed" : "pointer",
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}