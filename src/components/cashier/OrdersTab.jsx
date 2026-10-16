import { useState, useEffect, useRef } from "react";
import { subscribeToOrders, updateOrderStatus } from "../../services/orderService";

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

function peso(n) {
  return `₱${Math.round(n).toLocaleString("en-PH")}`;
}

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

// Short two-tone beep using the Web Audio API — no external file needed.
function playNotificationSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const playTone = (freq, startTime, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.2, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    const now = ctx.currentTime;
    playTone(880, now, 0.15);
    playTone(1175, now + 0.16, 0.18);
  } catch {
    // Ignore — sound is a nice-to-have, never block on it.
  }
}

export default function OrdersTab() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [filter, setFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState(null);
  const [toast, setToast] = useState(null);

  const knownIds = useRef(null); // null = not yet initialized (first load)

  useEffect(() => {
    const unsubscribe = subscribeToOrders((list) => {
      const sorted = [...list].sort((a, b) => b.createdAt - a.createdAt);

      if (knownIds.current === null) {
        // First snapshot — just record what's already there, don't notify.
        knownIds.current = new Set(sorted.map((o) => o.id));
      } else {
        const newCustomerOrders = sorted.filter(
          (o) => !knownIds.current.has(o.id) && !o.cashier
        );
        if (newCustomerOrders.length > 0) {
          playNotificationSound();
          const latest = newCustomerOrders[0];
          setToast({
            id: latest.id,
            text:
              newCustomerOrders.length === 1
                ? `New order from ${latest.customerName || "customer app"} — ${peso(latest.total)}`
                : `${newCustomerOrders.length} new orders from the customer app`,
          });
        }
        knownIds.current = new Set(sorted.map((o) => o.id));
      }

      setOrders(sorted);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const filteredOrders =
    filter === "all" ? orders : orders.filter((o) => (o.status || "completed") === filter);

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
    <div style={{ flex: 1, background: "#fff", border: "1px solid #e8e4dc", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden", position: "relative" }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1814", marginBottom: 12 }}>All Orders</div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer",
              background: filter === f ? "#2d2260" : "#f5f3ee",
              color: filter === f ? "#ede9fd" : "#8a8580",
              fontSize: 12, fontWeight: filter === f ? 600 : 500,
            }}
          >
            {f === "all" ? "All" : STATUS_LABELS[f]}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
        {loading ? (
          <div style={{ fontSize: 13, color: "#a8a39c" }}>Loading orders…</div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ fontSize: 13, color: "#a8a39c" }}>No orders here.</div>
        ) : (
          filteredOrders.map((o) => {
            const source = o.cashier ? "pos" : "customer";
            const status = o.status || "completed";
            const isActionable = status !== "completed" && status !== "cancelled";
            const upcoming = nextStatus(status);

            return (
              <div key={o.id} style={{ border: "1px solid #e8e4dc", borderRadius: 10, overflow: "hidden" }}>
                <div
                  onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", cursor: "pointer", gap: 12 }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: "#1a1814" }}>
                        {source === "pos" ? o.cashier?.name || "Cashier" : o.customerName || "Customer app order"}
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "#a8a39c" }}>
                        {source === "pos" ? "· POS" : "· Customer App"}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: "#a8a39c" }}>
                      {o.items?.length} item(s)
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                    <StatusBadge status={status} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#2d2260" }}>{peso(o.total)}</span>
                    <span style={{ fontSize: 11 }}>{expanded === o.id ? "▲" : "▼"}</span>
                  </div>
                </div>

                {expanded === o.id && (
                  <div style={{ borderTop: "1px solid #f0ede8", padding: "10px 14px", background: "#faf9f6" }}>
                    {o.items?.map((item, i) => {
                      const qty = item.qty ?? item.quantity ?? 0;
                      return (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "4px 0", color: "#6b6860" }}>
                          <span>{item.name} × {qty}</span>
                          <span>{peso(item.price * qty)}</span>
                        </div>
                      );
                    })}

                    {isActionable && (
                      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
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
                            padding: "8px 14px", borderRadius: 8, border: "1px solid #e8e4dc",
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
          })
        )}
      </div>

      {toast && (
        <div
          onClick={() => setToast(null)}
          style={{
            position: "absolute", bottom: 16, right: 16, left: 16, maxWidth: 360, marginLeft: "auto",
            background: "#2d2260", color: "#ede9fd", padding: "12px 16px", borderRadius: 10,
            fontSize: 13, fontWeight: 600, boxShadow: "0 4px 12px rgba(0,0,0,0.2)", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 8,
          }}
        >
          🔔 {toast.text}
        </div>
      )}
    </div>
  );
}