import { useState, useEffect } from "react";
import { getProducts } from "../../services/productService";
import { placeOrder, getOrders } from "../../services/orderService";
import { useAuth } from "../../contexts/AuthContext";
import { LOW_STOCK_THRESHOLD } from "../../utils/constants";
import { formatCurrency } from "../../utils/formatters";
import toast from "react-hot-toast";

const CATEGORIES = ["All", "Espresso", "Cold Drinks", "Non-Coffee", "Food"];
const PAYMENT_METHODS = ["Cash", "GCash"];

export default function POS() {
  const { user, logout } = useAuth();
  const [products, setProducts] = useState([]);
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [amountTendered, setAmountTendered] = useState("");
  const [gcashRef, setGcashRef] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [shiftStart] = useState(() => Date.now()); // locked to when POS was opened

  const loadProducts = () => getProducts().then(p => { setProducts(p); setLoading(false); });
  useEffect(() => { loadProducts(); }, []);

  const filtered = category === "All" ? products : products.filter(p => p.category === category);

  const addToCart = (product) => {
    if (product.stock <= 0) return toast.error("Out of stock!");
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) return toast("Max stock reached.") || prev;
        return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateQty = (id, delta) => {
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i));
  };

  const removeItem = (id) => setCart(prev => prev.filter(i => i.id !== id));

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const tendered = Number(amountTendered) || 0;
  const change = paymentMethod === "Cash" ? tendered - total : 0;

  const handleCheckout = async () => {
    if (!cart.length) return;
    if (paymentMethod === "Cash" && tendered < total)
      return toast.error("Amount tendered is less than total.");
    if (paymentMethod === "GCash" && !gcashRef.trim())
      return toast.error("Please enter the GCash reference number.");

    setPlacing(true);
    try {
      const orderData = {
        items: cart.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty })),
        total,
        paymentMethod,
        ...(paymentMethod === "Cash" && { amountTendered: tendered, change }),
        ...(paymentMethod === "GCash" && { gcashRef: gcashRef.trim() }),
        cashierId: user.uid,
        cashierName: user.name,
        status: "completed",
        createdAt: new Date(),
      };
      const orderId = await placeOrder(orderData);
      setReceipt({ ...orderData, orderId, createdAt: new Date() });
      setCart([]);
      setAmountTendered("");
      setGcashRef("");
      toast.success("Order placed!");
    } catch {
      toast.error("Failed to place order.");
    } finally {
      setPlacing(false);
    }
  };

  // ── Shift Report ─────────────────────────────────────────────────────────
  const generateReport = async () => {
    setReportLoading(true);
    try {
      const allOrders = await getOrders();
      // Filter: this cashier only, within this shift (since POS was opened)
      const shiftOrders = allOrders.filter(o =>
        o.cashierId === user.uid &&
        o.createdAt >= shiftStart
      );

      const totalSales = shiftOrders.reduce((s, o) => s + (o.total || 0), 0);
      const cashOrders = shiftOrders.filter(o => o.paymentMethod === "Cash");
      const gcashOrders = shiftOrders.filter(o => o.paymentMethod === "GCash");
      const cashTotal = cashOrders.reduce((s, o) => s + (o.total || 0), 0);
      const gcashTotal = gcashOrders.reduce((s, o) => s + (o.total || 0), 0);

      // Top items sold this shift
      const itemMap = {};
      shiftOrders.forEach(o => {
        o.items?.forEach(item => {
          if (!itemMap[item.name]) itemMap[item.name] = { qty: 0, revenue: 0 };
          itemMap[item.name].qty += item.qty;
          itemMap[item.name].revenue += item.price * item.qty;
        });
      });
      const topItems = Object.entries(itemMap)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5);

      setReport({
        generatedAt: new Date(),
        shiftStart: new Date(shiftStart),
        orderCount: shiftOrders.length,
        totalSales,
        cashTotal,
        gcashTotal,
        cashCount: cashOrders.length,
        gcashCount: gcashOrders.length,
        topItems,
        orders: shiftOrders.sort((a, b) => b.createdAt - a.createdAt),
      });
      setShowReport(true);
    } catch {
      toast.error("Failed to generate report.");
    } finally {
      setReportLoading(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: "8px 12px", borderRadius: 8,
    border: "0.5px solid #d0ccc4", fontSize: 13,
    background: "#fff", color: "#1a1814", outline: "none",
    boxSizing: "border-box", fontFamily: "inherit",
  };

  const labelStyle = {
    fontSize: 10, fontWeight: 600, color: "#9a9690",
    textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6, display: "block",
  };

  // ── Shift Report View ────────────────────────────────────────────────────
  if (showReport && report) {
    return (
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", minHeight: "100vh", background: "#f5f3ee", padding: "32px 16px" }}>
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e0ddd5", width: "100%", maxWidth: 560, padding: "28px 24px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1814" }}>Shift Report</div>
              <div style={{ fontSize: 11, color: "#9a9690", marginTop: 3 }}>
                {report.shiftStart.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                {" · "}
                {report.shiftStart.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}
                {" — "}
                {report.generatedAt.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}
              </div>
              <div style={{ fontSize: 11, color: "#9a9690", marginTop: 1 }}>Cashier: <strong style={{ color: "#1a1814" }}>{user?.name}</strong></div>
            </div>
            <button onClick={() => window.print()}
              style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #e0ddd5", background: "none", fontSize: 12, color: "#1a1814", cursor: "pointer", fontWeight: 500 }}>
              Print
            </button>
          </div>

          {/* Summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {[
              { label: "Total Sales", value: formatCurrency(report.totalSales), color: "#1a1814" },
              { label: "Orders", value: report.orderCount, color: "#1a1814" },
              { label: "Avg. Order", value: report.orderCount ? formatCurrency(report.totalSales / report.orderCount) : "—", color: "#1a1814" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: "#f5f3ee", borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: "#9a9690", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Payment breakdown */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#9a9690", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>Payment Breakdown</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                { method: "Cash", count: report.cashCount, total: report.cashTotal, bg: "#f0fdf4", color: "#166534", border: "#bbf7d0" },
                { method: "GCash", count: report.gcashCount, total: report.gcashTotal, bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
              ].map(({ method, count, total, bg, color, border }) => (
                <div key={method} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: 10, border: `1px solid ${border}`, background: bg }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color }}>{method}</span>
                    <span style={{ fontSize: 11, color, opacity: 0.7 }}>{count} order{count !== 1 ? "s" : ""}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color }}>{formatCurrency(total)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top items */}
          {report.topItems.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#9a9690", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>Top Items This Shift</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 1, borderRadius: 10, overflow: "hidden", border: "1px solid #e0ddd5" }}>
                {report.topItems.map((item, i) => (
                  <div key={item.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: i % 2 === 0 ? "#fff" : "#fdfcfb" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#9a9690", minWidth: 16 }}>#{i + 1}</span>
                      <span style={{ fontSize: 13, color: "#1a1814" }}>{item.name}</span>
                    </div>
                    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: "#9a9690" }}>{item.qty} sold</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1814" }}>{formatCurrency(item.revenue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Order log */}
          {report.orders.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#9a9690", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>Order Log</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 1, borderRadius: 10, overflow: "hidden", border: "1px solid #e0ddd5", maxHeight: 260, overflowY: "auto" }}>
                {report.orders.map((order, i) => (
                  <div key={order.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 14px", background: i % 2 === 0 ? "#fff" : "#fdfcfb" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 10, fontFamily: "monospace", color: "#9a9690" }}>
                        {new Date(order.createdAt).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <span style={{ fontSize: 11, color: "#6b6860" }}>{order.items?.map(i => i.name).join(", ")}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{
                        fontSize: 10, padding: "1px 7px", borderRadius: 20, fontWeight: 600,
                        background: order.paymentMethod === "Cash" ? "#f0fdf4" : "#eff6ff",
                        color: order.paymentMethod === "Cash" ? "#166534" : "#1d4ed8",
                      }}>{order.paymentMethod}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#1a1814" }}>{formatCurrency(order.total)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.orders.length === 0 && (
            <div style={{ textAlign: "center", padding: "20px 0", fontSize: 13, color: "#9a9690" }}>
              No orders recorded this shift yet.
            </div>
          )}

          {/* Back */}
          <button onClick={() => setShowReport(false)}
            style={{ padding: "11px", borderRadius: 8, background: "#2d2260", color: "#ede9fd", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Back to POS
          </button>
        </div>
      </div>
    );
  }

  // ── Receipt ──────────────────────────────────────────────────────────────
  if (receipt) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f5f3ee" }}>
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e0ddd5", width: 360, maxHeight: "90vh", overflowY: "auto", padding: "28px 24px", display: "flex", flexDirection: "column" }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>☕</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1814", letterSpacing: "-0.3px" }}>Kape Eskinita</div>
            <div style={{ fontSize: 11, color: "#9a9690", marginTop: 2 }}>Official Receipt</div>
          </div>

          <div style={{ borderTop: "1px dashed #e0ddd5", borderBottom: "1px dashed #e0ddd5", padding: "12px 0", marginBottom: 16, display: "flex", flexDirection: "column", gap: 4 }}>
            {[
              ["Date", receipt.createdAt.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })],
              ["Time", receipt.createdAt.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })],
              ["Cashier", receipt.cashierName],
              ...(receipt.orderId ? [["Order #", String(receipt.orderId).slice(-6).toUpperCase()]] : []),
            ].map(([label, val]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#9a9690" }}>
                <span>{label}</span>
                <span style={label === "Order #" ? { fontFamily: "monospace" } : {}}>{val}</span>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {receipt.items.map((item, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", fontSize: 13 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: "#1a1814" }}>{item.name}</div>
                  <div style={{ fontSize: 11, color: "#9a9690" }}>x{item.qty} @ {formatCurrency(item.price)}</div>
                </div>
                <div style={{ fontWeight: 600, color: "#1a1814", marginLeft: 12 }}>{formatCurrency(item.price * item.qty)}</div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: "1px dashed #e0ddd5", paddingTop: 12, display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 700, color: "#1a1814" }}>
              <span>Total</span><span>{formatCurrency(receipt.total)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
              <span style={{ color: "#9a9690" }}>Payment</span>
              <span style={{
                padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                background: receipt.paymentMethod === "Cash" ? "#f0fdf4" : "#eff6ff",
                color: receipt.paymentMethod === "Cash" ? "#166534" : "#1d4ed8",
                border: `1px solid ${receipt.paymentMethod === "Cash" ? "#bbf7d0" : "#bfdbfe"}`,
              }}>{receipt.paymentMethod}</span>
            </div>
            {receipt.paymentMethod === "Cash" && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#9a9690" }}>
                  <span>Tendered</span><span>{formatCurrency(receipt.amountTendered)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600, color: "#166534" }}>
                  <span>Change</span><span>{formatCurrency(receipt.change)}</span>
                </div>
              </>
            )}
            {receipt.paymentMethod === "GCash" && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "#9a9690" }}>Ref #</span>
                <span style={{ fontFamily: "monospace", fontWeight: 600, color: "#1d4ed8", letterSpacing: "0.5px" }}>{receipt.gcashRef}</span>
              </div>
            )}
          </div>

          <div style={{ textAlign: "center", fontSize: 11, color: "#b5b1aa", marginBottom: 20 }}>
            Thank you for your order!
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => window.print()}
              style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid #e0ddd5", background: "none", fontSize: 13, color: "#1a1814", cursor: "pointer", fontWeight: 500 }}>
              Print
            </button>
            <button onClick={() => { setReceipt(null); loadProducts(); }}
              style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: "#2d2260", color: "#ede9fd", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              New Order
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── POS ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", height: "100vh", background: "#f5f3ee" }}>
      {/* Menu side */}
      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", background: "#fff", borderBottom: "0.5px solid #e0ddd5" }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: "#1a1814" }}>☕ Kape Eskinita</span>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 13, color: "#6b6860" }}>👤 {user?.name}</span>
            <button onClick={generateReport} disabled={reportLoading}
              style={{ fontSize: 12, color: "#2d2260", background: "none", border: "0.5px solid #c4bef0", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontWeight: 500 }}>
              {reportLoading ? "Loading..." : "My Shift"}
            </button>
            <button onClick={logout}
              style={{ fontSize: 12, color: "#9a9690", background: "none", border: "0.5px solid #d0ccc4", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>
              Logout
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, padding: "10px 20px", background: "#fff", borderBottom: "0.5px solid #e0ddd5", overflowX: "auto" }}>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)}
              style={{ padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 500, border: category === cat ? "0.5px solid #2d2260" : "0.5px solid #d0ccc4", background: category === cat ? "#2d2260" : "transparent", color: category === cat ? "#ede9fd" : "#6b6860", whiteSpace: "nowrap", cursor: "pointer" }}>
              {cat}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10, alignContent: "start" }}>
          {loading
            ? <p style={{ color: "#9a9690", fontSize: 13 }}>Loading menu...</p>
            : filtered.length === 0
              ? <p style={{ color: "#9a9690", fontSize: 13 }}>No products found.</p>
              : filtered.map(product => (
                <div key={product.id} onClick={() => addToCart(product)}
                  style={{ background: "#fff", border: "0.5px solid #e0ddd5", borderRadius: 10, overflow: "hidden", cursor: product.stock > 0 ? "pointer" : "not-allowed", opacity: product.stock > 0 ? 1 : 0.5, transition: "all 0.15s" }}>
                  <div style={{ width: "100%", aspectRatio: "4/3", background: "#f5f3ee", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    {product.photoUrl
                      ? <img src={product.photoUrl} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <span style={{ fontSize: 32 }}>☕</span>}
                  </div>
                  <div style={{ padding: "8px 10px" }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: "#1a1814", marginBottom: 2, lineHeight: 1.3 }}>{product.name}</div>
                    <div style={{ fontSize: 12, color: "#2d2260", fontWeight: 600 }}>{formatCurrency(product.price)}</div>
                    {product.stock <= LOW_STOCK_THRESHOLD && product.stock > 0 &&
                      <div style={{ fontSize: 10, color: "#b45309", marginTop: 3 }}>Low stock: {product.stock}</div>}
                    {product.stock <= 0 &&
                      <div style={{ fontSize: 10, color: "#dc2626", marginTop: 3 }}>Out of stock</div>}
                  </div>
                </div>
              ))
          }
        </div>
      </div>

      {/* Order side */}
      <div style={{ display: "flex", flexDirection: "column", background: "#f2f0eb", borderLeft: "0.5px solid #e0ddd5" }}>
        <div style={{ padding: "14px 16px", borderBottom: "0.5px solid #e0ddd5" }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: "#1a1814" }}>Current Order</span>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
          {!cart.length
            ? <p style={{ color: "#b5b1aa", fontSize: 13, textAlign: "center", marginTop: 40 }}>No items yet.<br />Tap a product to add.</p>
            : cart.map(item => (
              <div key={item.id} style={{ background: "#fff", border: "0.5px solid #e0ddd5", borderRadius: 8, padding: "10px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, fontSize: 12, fontWeight: 500 }}>{item.name}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button onClick={() => updateQty(item.id, -1)} style={{ width: 20, height: 20, borderRadius: "50%", border: "0.5px solid #ccc", background: "none", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>−</button>
                  <span style={{ fontSize: 12, fontWeight: 600, minWidth: 16, textAlign: "center" }}>{item.qty}</span>
                  <button onClick={() => updateQty(item.id, 1)} style={{ width: 20, height: 20, borderRadius: "50%", border: "0.5px solid #ccc", background: "none", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>+</button>
                </div>
                <div style={{ fontSize: 12, color: "#6b6860", minWidth: 52, textAlign: "right" }}>{formatCurrency(item.price * item.qty)}</div>
                <button onClick={() => removeItem(item.id)} style={{ fontSize: 14, color: "#dc2626", background: "none", border: "none", padding: "0 2px", cursor: "pointer" }}>×</button>
              </div>
            ))
          }
        </div>

        <div style={{ padding: "12px 16px", borderTop: "0.5px solid #e0ddd5", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 600, color: "#1a1814" }}>
            <span>Total</span><span>{formatCurrency(total)}</span>
          </div>

          <div>
            <label style={labelStyle}>Payment method</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {PAYMENT_METHODS.map(method => (
                <button key={method} onClick={() => { setPaymentMethod(method); setAmountTendered(""); setGcashRef(""); }}
                  style={{ padding: "7px", borderRadius: 8, fontSize: 12, fontWeight: 500, border: paymentMethod === method ? "1.5px solid #2d2260" : "0.5px solid #d0ccc4", background: paymentMethod === method ? "#2d2260" : "#fff", color: paymentMethod === method ? "#ede9fd" : "#6b6860", cursor: "pointer" }}>
                  {method}
                </button>
              ))}
            </div>
          </div>

          {paymentMethod === "Cash" && (
            <div>
              <label style={labelStyle}>Amount tendered</label>
              <input
                type="number" min={total} value={amountTendered}
                onChange={e => setAmountTendered(e.target.value)}
                placeholder={`Min. ${formatCurrency(total)}`}
                style={inputStyle}
              />
              {tendered >= total && tendered > 0 && (
                <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span style={{ color: "#9a9690" }}>Change</span>
                  <span style={{ fontWeight: 600, color: "#166534" }}>{formatCurrency(change)}</span>
                </div>
              )}
            </div>
          )}

          {paymentMethod === "GCash" && (
            <div>
              <label style={labelStyle}>GCash reference number</label>
              <input
                type="text" value={gcashRef}
                onChange={e => setGcashRef(e.target.value)}
                placeholder="e.g. 1234567890"
                maxLength={13}
                style={{ ...inputStyle, fontFamily: "monospace", letterSpacing: "0.5px" }}
              />
            </div>
          )}

          <button onClick={handleCheckout} disabled={!cart.length || placing}
            style={{ padding: "11px", borderRadius: 8, background: cart.length ? "#2d2260" : "#d0ccc4", color: cart.length ? "#ede9fd" : "#9a9690", border: "none", fontSize: 13, fontWeight: 600, cursor: cart.length ? "pointer" : "not-allowed" }}>
            {placing ? "Placing..." : `Charge ${formatCurrency(total)}`}
          </button>

          <button onClick={() => setCart([])} style={{ background: "none", border: "none", fontSize: 12, color: "#b5b1aa", textDecoration: "underline", cursor: "pointer" }}>
            Clear order
          </button>
        </div>
      </div>
    </div>
  );
}