import { useState, useEffect } from "react";
import { getProducts, checkProductAvailability } from "../../services/productService";
import { placeOrder, getOrders, updateOrderStatus } from "../../services/orderService";
import { updateCustomerOrderStatus } from "../../services/customerOrderService";
import { logAction } from "../../services/auditService";
import { useAuth } from "../../contexts/AuthContext";
import { ref, get } from "firebase/database";
import { rtdb } from "../../services/firebase";
import { TAX_RATE, LOW_STOCK_THRESHOLD, CATEGORIES, NO_SIZE_CATEGORIES } from "../../utils/constants";
import { formatCurrency } from "../../utils/formatters";
import PaymentModal from "./PaymentModal";
import ReceiptModal from "./ReceiptModal";
import SizeModal from "./SizeModal";
import toast from "react-hot-toast";

const STATUS_FLOW = { ordered: "preparing", preparing: "ready", ready: "completed" };
const STATUS_LABEL = { ordered: "Ordered", preparing: "Preparing", ready: "Ready", completed: "Completed" };
const STATUS_STYLE = {
  ordered:    { background: "#dbeafe", color: "#1e40af" },
  preparing:  { background: "#fef3c7", color: "#92400e" },
  ready:      { background: "#d1fae5", color: "#065f46" },
  completed:  { background: "#f3f4f6", color: "#6b7280" },
};

export default function POS() {
  const { user, logout } = useAuth();
  const [products, setProducts] = useState([]);
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [search, setSearch] = useState("");
  const [sizeProduct, setSizeProduct] = useState(null);

  const [activeTab, setActiveTab] = useState("order");
  const [customerOrders, setCustomerOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const loadProducts = async () => {
    const p = await getProducts();
    const withAvailability = await checkProductAvailability(p);
    setProducts(withAvailability);
    setLoading(false);
  };

  const loadOrders = async () => {
    setOrdersLoading(true);
    try {
      const snap = await get(ref(rtdb, "customerOrders"));
      if (!snap.exists()) { setCustomerOrders([]); setOrdersLoading(false); return; }
      const all = Object.entries(snap.val()).map(([id, val]) => ({ id, ...val }));
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const queue = all
        .filter(o => o.createdAt >= today.getTime() && o.status !== "completed")
        .sort((a, b) => b.createdAt - a.createdAt);
      setCustomerOrders(queue);
    } catch {
      toast.error("Failed to load orders.");
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => { loadProducts(); }, []);
  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 15000);
    return () => clearInterval(interval);
  }, []);

  const pendingCount = customerOrders.filter(o => o.status === "ordered").length;

  const handleAdvanceStatus = async (order) => {
    const next = STATUS_FLOW[order.status];
    if (!next) return;
    try {
      await updateCustomerOrderStatus(order.id, next);
      await logAction(user.uid, user.name, "UPDATE_ORDER_STATUS", `Order ${order.id} → ${next}`);
      toast.success(`Order marked as ${STATUS_LABEL[next]}`);
      loadOrders();
      if (selectedOrder?.id === order.id) setSelectedOrder({ ...order, status: next });
    } catch {
      toast.error("Failed to update order.");
    }
  };

  const allCategories = ["All", ...CATEGORIES];
  const filtered = products
    .filter(p => category === "All" || p.category === category)
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  const handleProductTap = (product) => {
    if (!product.available) {
      return toast.error(`⛔ Blocked — ingredient(s) out of stock: ${product.blockedBy.join(", ")}`);
    }
    if (product.stock <= 0) return toast.error("Out of stock!");
    if (NO_SIZE_CATEGORIES.includes(product.category)) {
      addToCart(product, null);
    } else {
      setSizeProduct(product);
    }
  };

  const addToCart = (product, size) => {
    const finalPrice = size ? product.price + size.priceAdd : product.price;
    const cartKey = size ? `${product.id}-${size.label}` : product.id;
    const itemName = size ? `${product.name} (${size.label})` : product.name;
    setCart(prev => {
      const existing = prev.find(i => i.cartKey === cartKey);
      if (existing) {
        if (existing.qty >= product.stock) { toast("Max stock reached."); return prev; }
        return prev.map(i => i.cartKey === cartKey ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { cartKey, id: product.id, name: itemName, price: finalPrice, qty: 1, size: size?.label || null }];
    });
    setSizeProduct(null);
  };

  const updateQty = (cartKey, delta) => {
    setCart(prev => prev.map(i => i.cartKey === cartKey ? { ...i, qty: i.qty + delta } : i).filter(i => i.qty > 0));
  };

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  const handleConfirmPayment = async (paymentInfo) => {
    try {
      const order = {
        items: cart.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty, size: i.size || null })),
        subtotal, tax, total,
        payment: paymentInfo,
        cashierId: user.uid,
        cashierName: user.name,
        status: "completed",
        createdAt: Date.now(),
      };
      await placeOrder(order);
      await logAction(user.uid, user.name, "PLACE_ORDER", `Total: ${formatCurrency(total)} via ${paymentInfo.method}`);
      setLastOrder(order);
      setCart([]);
      setShowPayment(false);
      loadProducts();
      toast.success("Order placed!");
    } catch {
      toast.error("Failed to place order.");
    }
  };

  // ─── Right Panel: Current Order ──────────────────────────────────────────

  function OrderPanel() {
    return (
      <>
        <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
          {!cart.length
            ? <p style={{ color: "#b5b1aa", fontSize: 13, textAlign: "center", marginTop: 40, lineHeight: 1.6 }}>No items yet.<br />Tap a product to add.</p>
            : cart.map(item => (
              <div key={item.cartKey} style={{ background: "#fff", border: "1px solid #e8e2d9", borderRadius: 10, padding: "10px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#1a1814" }}>{item.name}</div>
                  <div style={{ fontSize: 11, color: "#9a9690" }}>{formatCurrency(item.price)} each</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button onClick={() => updateQty(item.cartKey, -1)} style={{ width: 22, height: 22, borderRadius: "50%", border: "1px solid #e8e2d9", background: "#f5f3ee", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600 }}>−</button>
                  <span style={{ fontSize: 13, fontWeight: 700, minWidth: 18, textAlign: "center" }}>{item.qty}</span>
                  <button onClick={() => updateQty(item.cartKey, 1)} style={{ width: 22, height: 22, borderRadius: "50%", border: "1px solid #e8e2d9", background: "#f5f3ee", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600 }}>+</button>
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#1a1814", minWidth: 56, textAlign: "right" }}>{formatCurrency(item.price * item.qty)}</div>
              </div>
            ))
          }
        </div>

        <div style={{ padding: "12px 16px", borderTop: "1px solid #e8e2d9", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#9a9690" }}><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#9a9690" }}><span>VAT (12%)</span><span>{formatCurrency(tax)}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 700, color: "#1a1814", marginBottom: 4 }}><span>Total</span><span>{formatCurrency(total)}</span></div>
          <button onClick={() => setShowPayment(true)} disabled={!cart.length}
            style={{ padding: 12, borderRadius: 10, background: cart.length ? "#1a1814" : "#d0ccc4", color: cart.length ? "#fff" : "#9a9690", border: "none", fontSize: 14, fontWeight: 700, cursor: cart.length ? "pointer" : "not-allowed" }}>
            {cart.length ? `Charge ${formatCurrency(total)}` : "Add items to charge"}
          </button>
          {cart.length > 0 && (
            <button onClick={() => setCart([])} style={{ background: "none", border: "none", fontSize: 12, color: "#b5b1aa", textDecoration: "underline", cursor: "pointer" }}>Clear order</button>
          )}
        </div>
      </>
    );
  }

  // ─── Right Panel: Customer Order Queue ───────────────────────────────────

  function QueuePanel() {
    return (
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
        {ordersLoading && !customerOrders.length
          ? <p style={{ color: "#9a9690", fontSize: 13, textAlign: "center", marginTop: 40 }}>Loading orders…</p>
          : customerOrders.length === 0
          ? <p style={{ color: "#b5b1aa", fontSize: 13, textAlign: "center", marginTop: 40, lineHeight: 1.6 }}>No active customer orders.<br />Online orders will appear here.</p>
          : customerOrders.map(order => {
            const isSelected = selectedOrder?.id === order.id;
            const st = STATUS_STYLE[order.status] || STATUS_STYLE.ordered;
            const nextStatus = STATUS_FLOW[order.status];
            return (
              <div key={order.id}
                onClick={() => setSelectedOrder(isSelected ? null : order)}
                style={{ background: "#fff", border: `1px solid ${isSelected ? "#1a1814" : "#e8e2d9"}`, borderRadius: 10, padding: "10px 12px", cursor: "pointer", transition: "border-color 0.15s" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#1a1814" }}>#{String(order.id).slice(-5).toUpperCase()}</span>
                    <span style={{ fontSize: 11, color: "#9a9690", marginLeft: 6 }}>{order.customerName || "Customer"}</span>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, ...st }}>{STATUS_LABEL[order.status] || order.status}</span>
                </div>
                <div style={{ fontSize: 11, color: "#6b6860", marginBottom: 4 }}>
                  {(order.items || []).map(i => `${i.name} x${i.qty}`).join(" · ")}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "#9a9690" }}>
                    {new Date(order.createdAt).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}
                    {order.pickupTime ? ` · Pickup ${order.pickupTime}` : ""}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#1a1814" }}>{formatCurrency(order.total)}</span>
                </div>
                {isSelected && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #e8e2d9" }}>
                    {order.note && (
                      <div style={{ fontSize: 11, color: "#b45309", background: "#fef3c7", borderRadius: 6, padding: "4px 8px", marginBottom: 8 }}>📝 {order.note}</div>
                    )}
                    {order.payment?.method && (
                      <div style={{ fontSize: 11, color: "#6b6860", marginBottom: 8 }}>💳 {order.payment.method}</div>
                    )}
                    {nextStatus && (
                      <button onClick={(e) => { e.stopPropagation(); handleAdvanceStatus(order); }}
                        style={{ width: "100%", padding: "8px", borderRadius: 8, background: "#1a1814", color: "#fff", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                        Mark as {STATUS_LABEL[nextStatus]} →
                      </button>
                    )}
                    {!nextStatus && <div style={{ textAlign: "center", fontSize: 12, color: "#6db87a", fontWeight: 600 }}>✅ Completed</div>}
                  </div>
                )}
              </div>
            );
          })
        }
        <button onClick={loadOrders} style={{ marginTop: 4, background: "none", border: "1px solid #e8e2d9", borderRadius: 8, padding: "7px", fontSize: 12, color: "#6b6860", cursor: "pointer" }}>
          ↻ Refresh
        </button>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", height: "100vh", background: "#f5f3ee", fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>

      {/* ── Menu Side ── */}
      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", background: "#fff", borderBottom: "1px solid #e8e2d9" }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#1a1814" }}>☕ Kape Eskinita</span>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search menu..."
              style={{ padding: "7px 12px", border: "1px solid #e8e2d9", borderRadius: 20, fontSize: 12, background: "#f5f3ee", outline: "none", width: 160 }} />
            <span style={{ fontSize: 12, color: "#6b6860" }}>👤 {user?.name}</span>
            <button onClick={logout}
              style={{ fontSize: 12, color: "#9a9690", background: "none", border: "1px solid #e8e2d9", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>
              Logout
            </button>
          </div>
        </div>

        {/* Category tabs */}
        <div style={{ display: "flex", gap: 8, padding: "10px 20px", background: "#fff", borderBottom: "1px solid #e8e2d9", overflowX: "auto" }}>
          {allCategories.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)}
              style={{ padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 500, border: category === cat ? "1px solid #1a1814" : "1px solid #e8e2d9", background: category === cat ? "#1a1814" : "transparent", color: category === cat ? "#fff" : "#6b6860", whiteSpace: "nowrap", cursor: "pointer" }}>
              {cat}
            </button>
          ))}
        </div>

        {/* ── Product Grid — matches ProductsManagement style ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          {loading
            ? <p style={{ color: "#9a9690", fontSize: 13 }}>Loading menu...</p>
            : filtered.length === 0
            ? <p style={{ color: "#9a9690", fontSize: 13 }}>No products found.</p>
            : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14, alignContent: "start" }}>
                {filtered.map(product => {
                  const isBlocked   = !product.available;
                  const isOutOfStock = product.stock <= 0;
                  const disabled    = isBlocked || isOutOfStock;
                  const needsSize   = !NO_SIZE_CATEGORIES.includes(product.category);

                  return (
                    <div key={product.id}
                      onClick={() => handleProductTap(product)}
                      style={{
                        background: "#fff",
                        border: isBlocked ? "1px solid #fca5a5" : "1px solid #e8e2d9",
                        borderRadius: 14,
                        overflow: "hidden",
                        cursor: disabled ? "not-allowed" : "pointer",
                        opacity: disabled ? 0.6 : 1,
                        transition: "box-shadow 0.15s, transform 0.15s",
                        position: "relative",
                      }}
                      onMouseEnter={e => { if (!disabled) { e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.10)"; e.currentTarget.style.transform = "translateY(-2px)"; } }}
                      onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}
                    >
                      {/* Status badges */}
                      {isBlocked && (
                        <div style={{ position: "absolute", top: 8, right: 8, background: "#dc2626", color: "#fff", fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 20, zIndex: 1 }}>⛔ BLOCKED</div>
                      )}
                      {!isBlocked && isOutOfStock && (
                        <div style={{ position: "absolute", top: 8, right: 8, background: "#6b6860", color: "#fff", fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 20, zIndex: 1 }}>SOLD OUT</div>
                      )}
                      {!disabled && needsSize && (
                        <div style={{ position: "absolute", top: 8, left: 8, background: "#4a3d8f", color: "#fff", fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 20, zIndex: 1 }}>T / G / V</div>
                      )}

                      {/* Photo — same 4:3 ratio as ProductsManagement */}
                      <div style={{ width: "100%", aspectRatio: "4/3", background: "#f5f3ee", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {product.photoUrl
                          ? <img src={product.photoUrl} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : <span style={{ fontSize: 40 }}>☕</span>}
                      </div>

                      {/* Info */}
                      <div style={{ padding: "12px 14px" }}>

                        {/* Name + Price */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1814", lineHeight: 1.3, flex: 1 }}>{product.name}</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1814", marginLeft: 8, whiteSpace: "nowrap" }}>
                            {needsSize ? `from ${formatCurrency(product.price)}` : formatCurrency(product.price)}
                          </div>
                        </div>

                        {/* Description */}
                        {product.description && (
                          <div style={{ fontSize: 11, color: "#9a9690", marginBottom: 8, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                            {product.description}
                          </div>
                        )}

                        {/* Category + Stock row */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                          <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#f5f3ee", color: "#6b6860" }}>
                            {product.category}
                          </span>
                          <span style={{
                            fontSize: 11, fontWeight: 500,
                            color: product.stock <= 0 ? "#dc2626"
                              : product.stock <= LOW_STOCK_THRESHOLD ? "#b45309"
                              : "#166534",
                          }}>
                            {product.stock <= 0
                              ? "Out of stock"
                              : product.stock <= LOW_STOCK_THRESHOLD
                              ? `⚠ Low: ${product.stock}`
                              : `${product.stock} in stock`}
                          </span>
                        </div>

                        {/* Blocked reason */}
                        {isBlocked && (
                          <div style={{ fontSize: 10, color: "#dc2626", marginTop: 6, lineHeight: 1.4 }}>
                            Missing: {product.blockedBy.join(", ")}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          }
        </div>
      </div>

      {/* ── Right Panel ── */}
      <div style={{ display: "flex", flexDirection: "column", background: "#f2f0eb", borderLeft: "1px solid #e8e2d9" }}>

        {/* Tab switcher */}
        <div style={{ display: "flex", borderBottom: "1px solid #e8e2d9", background: "#fff", flexShrink: 0 }}>
          <button onClick={() => setActiveTab("order")}
            style={{ flex: 1, padding: "12px 0", fontSize: 12, fontWeight: 700, border: "none", background: "none", cursor: "pointer", borderBottom: activeTab === "order" ? "2px solid #1a1814" : "2px solid transparent", color: activeTab === "order" ? "#1a1814" : "#9a9690" }}>
            Current Order
            {cart.length > 0 && (
              <span style={{ marginLeft: 6, fontSize: 10, background: "#1a1814", color: "#fff", borderRadius: 20, padding: "1px 6px" }}>{cart.length}</span>
            )}
          </button>
          <button onClick={() => { setActiveTab("queue"); loadOrders(); }}
            style={{ flex: 1, padding: "12px 0", fontSize: 12, fontWeight: 700, border: "none", background: "none", cursor: "pointer", borderBottom: activeTab === "queue" ? "2px solid #1a1814" : "2px solid transparent", color: activeTab === "queue" ? "#1a1814" : "#9a9690", position: "relative" }}>
            Order Queue
            {pendingCount > 0 && (
              <span style={{ marginLeft: 6, fontSize: 10, background: "#dc2626", color: "#fff", borderRadius: 20, padding: "1px 6px" }}>{pendingCount}</span>
            )}
          </button>
        </div>

        {activeTab === "order" ? <OrderPanel /> : <QueuePanel />}
      </div>

      {sizeProduct && <SizeModal product={sizeProduct} onConfirm={addToCart} onClose={() => setSizeProduct(null)} />}
      {showPayment && <PaymentModal total={total} onConfirm={handleConfirmPayment} onClose={() => setShowPayment(false)} />}
      {lastOrder && <ReceiptModal order={lastOrder} onClose={() => setLastOrder(null)} />}
    </div>
  );
}