// src/components/cashier/POS.jsx
import { useState, useEffect, useMemo, useRef } from "react";
import { ref, get, push, set, onValue, serverTimestamp } from "firebase/database";
import { rtdb } from "../../services/firebase";
import { useAuth } from "../../contexts/AuthContext";
import {
  MATERIALS_PATH, CUP_LABEL, SIZES, findCups,
  needsSize, priceForSize, deductCups,
} from "../../services/cupService";
import OrdersTab from "./OrdersTab";

const PRODUCTS_PATH = "products";
const ORDERS_PATH = "orders";

function peso(n) {
  return `₱${Math.round(n).toLocaleString("en-PH")}`;
}

/* ───────────────────────── Size picker ───────────────────────── */
function SizeModal({ product, cupStock, onPick, onCancel }) {
  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      style={{
        position: "fixed", inset: 0, background: "rgba(26,24,20,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
      }}
    >
      <div style={{ background: "#fff", borderRadius: 16, padding: "28px 28px 22px", width: 340 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1814", marginBottom: 2 }}>{product.name}</div>
        <div style={{ fontSize: 12, color: "#a8a39c", marginBottom: 18 }}>Choose a size</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {SIZES.map((size) => {
            const left = cupStock[size]?.stock;
            const out = left !== undefined && left <= 0;
            return (
              <button
                key={size}
                disabled={out}
                onClick={() => onPick(size)}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "12px 14px", borderRadius: 10, border: "1px solid #e8e4dc",
                  background: out ? "#f5f3ee" : "#fdfcfa", cursor: out ? "not-allowed" : "pointer",
                  opacity: out ? 0.55 : 1, fontFamily: "inherit", textAlign: "left",
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1814" }}>{size}</div>
                  <div style={{ fontSize: 11, color: out ? "#c0392b" : "#a8a39c" }}>
                    {CUP_LABEL[size]} cup · {out ? "out of stock" : left !== undefined ? `${left} left` : ""}
                  </div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#2d2260" }}>
                  {peso(priceForSize(product, size))}
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={onCancel}
          style={{
            width: "100%", marginTop: 14, padding: "10px 0", borderRadius: 8,
            border: "1px solid #e8e4dc", background: "transparent",
            color: "#8a8580", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ───────────────────────── Scan to pay ───────────────────────── */
function ScanToPayModal({ amount, onConfirm, onCancel, submitting }) {
  const [value, setValue] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && value.trim() && !submitting) {
      onConfirm(value.trim());
    }
  };

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      style={{
        position: "fixed", inset: 0, background: "rgba(26,24,20,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
      }}
    >
      <div style={{ background: "#fff", borderRadius: 16, padding: "32px 36px", width: 340, textAlign: "center" }}>
        <div style={{ fontSize: 13, color: "#8a8580", marginBottom: 4 }}>Amount due</div>
        <div style={{ fontSize: 32, fontWeight: 700, color: "#1a1814", marginBottom: 20 }}>{peso(amount)}</div>

        <div
          style={{
            width: 64, height: 64, borderRadius: "50%", margin: "0 auto 16px",
            border: "3px solid #2d2260", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 26, animation: "pos-pulse 1.4s ease-in-out infinite",
          }}
        >
          📷
        </div>

        <div style={{ fontSize: 13, color: "#1a1814", fontWeight: 600, marginBottom: 4 }}>
          Scan customer's GCash / Maya QR
        </div>
        <div style={{ fontSize: 12, color: "#a8a39c", marginBottom: 16 }}>
          Use the scanner on the POS terminal
        </div>

        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Waiting for scan…"
          style={{
            width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 8,
            border: "1px solid #e8e4dc", fontSize: 13, color: "#1a1814", textAlign: "center",
            marginBottom: 16,
          }}
        />

        <button
          onClick={onCancel}
          disabled={submitting}
          style={{
            width: "100%", padding: "10px 0", borderRadius: 8, border: "1px solid #e8e4dc",
            background: "transparent", color: "#8a8580", fontSize: 13, fontWeight: 600,
            cursor: submitting ? "not-allowed" : "pointer",
          }}
        >
          Cancel
        </button>

        <style>{`
          @keyframes pos-pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(45,34,96,0.25); }
            50% { box-shadow: 0 0 0 10px rgba(45,34,96,0.05); }
          }
        `}</style>
      </div>
    </div>
  );
}

/* ───────────────────────── POS ───────────────────────── */
export default function POS() {
  const { user, logout } = useAuth();
  const [products, setProducts] = useState([]);
  const [cupStock, setCupStock] = useState({}); // { Tall: {stock,min}, Grande: {...}, Venti: {...} } from /materials
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [scanning, setScanning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [tab, setTab] = useState("new-order"); // "new-order" | "orders"
  const [sizeFor, setSizeFor] = useState(null); // product waiting for a size

  useEffect(() => {
    let active = true;
    get(ref(rtdb, PRODUCTS_PATH))
      .then((snap) => {
        if (!active) return;
        const val = snap.val() || {};
        const rows = Object.entries(val).map(([id, data]) => ({ id, ...data }));
        setProducts(rows);
      })
      .catch((err) => {
        if (active) setError(err.message || "Failed to load products.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    // live cup stock straight from the database
    const unsub = onValue(
      ref(rtdb, MATERIALS_PATH),
      (snap) => setCupStock(findCups(snap.val())),
      () => {}
    );
    return () => { active = false; unsub(); };
  }, []);

  useEffect(() => {
    if (!lastOrder) return;
    const t = setTimeout(() => setLastOrder(null), 3500);
    return () => clearTimeout(t);
  }, [lastOrder]);

  const categories = useMemo(() => {
    const found = new Set(products.map((p) => p.category || "Other"));
    return ["All", ...Array.from(found)];
  }, [products]);

  const visibleProducts = useMemo(() => {
    return category === "All" ? products : products.filter((p) => (p.category || "Other") === category);
  }, [products, category]);

  const total = useMemo(() => cart.reduce((s, item) => s + item.price * item.quantity, 0), [cart]);

  // Tapping a product: drinks ask for a size first, food goes straight in.
  function handleProductClick(product) {
    if (needsSize(product)) setSizeFor(product);
    else addToCart(product, null);
  }

  function addToCart(product, size) {
    const key = size ? `${product.id}__${size}` : product.id;
    const price = size ? priceForSize(product, size) : product.price || 0;
    const name = product.name || "Unnamed item";
    setCart((prev) => {
      const existing = prev.find((i) => i.key === key);
      if (existing) {
        return prev.map((i) => (i.key === key ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [
        ...prev,
        {
          key,
          productId: product.id,
          name: size ? `${name} (${size})` : name,
          size,
          price,
          quantity: 1,
        },
      ];
    });
    setSizeFor(null);
  }

  function changeQty(key, delta) {
    setCart((prev) =>
      prev
        .map((i) => (i.key === key ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  }

  function removeItem(key) {
    setCart((prev) => prev.filter((i) => i.key !== key));
  }

  function clearCart() {
    setCart([]);
    setPaymentMethod("cash");
  }

  async function completeOrder(extra = {}) {
    if (cart.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const orderRef = push(ref(rtdb, ORDERS_PATH));
      await set(orderRef, {
        items: cart.map(({ productId, name, size, price, quantity }) => ({
          productId, name, size: size || null, price, quantity,
        })),
        total,
        status: "pending",
        createdAt: serverTimestamp(),
        paymentMethod,
        cashier: { uid: user?.uid || null, name: user?.name || user?.email || "Unknown" },
        ...extra,
      });

      // Order is saved — now take the cups out of inventory.
      try {
        await deductCups(cart);
      } catch (cupErr) {
        setError("Order saved, but cup stock could not be updated: " + (cupErr.message || "unknown error"));
      }

      setLastOrder({ id: orderRef.key, total, itemCount: cart.length });
      clearCart();
    } catch (err) {
      setError(err.message || "Failed to save order. Please try again.");
    } finally {
      setSubmitting(false);
      setScanning(false);
    }
  }

  function handleCharge() {
    if (cart.length === 0 || submitting) return;
    if (paymentMethod === "qr") {
      setScanning(true);
    } else {
      completeOrder();
    }
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#f5f3ee" }}>
      {/* Top bar */}
      <div style={{ background: "#1a1814", color: "#f5f3ee", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>☕ Kape Eskinita</div>
          <div style={{ fontSize: 11, color: "#9a9690", marginTop: 2 }}>Point of Sale</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: 12, color: "#9a9690" }}>👤 {user?.name || user?.email}</div>
          <button onClick={logout} style={{ padding: "7px 14px", borderRadius: 8, border: "0.5px solid #2c2924", background: "transparent", color: "#9a9690", fontSize: 12, cursor: "pointer" }}>
            Sign out
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 6, padding: "10px 24px 0", background: "#f5f3ee" }}>
        <button
          onClick={() => setTab("new-order")}
          style={{
            padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer",
            background: tab === "new-order" ? "#2d2260" : "#f0ede8",
            color: tab === "new-order" ? "#ede9fd" : "#8a8580", fontSize: 12, fontWeight: 600,
          }}
        >
          New Order
        </button>
        <button
          onClick={() => setTab("orders")}
          style={{
            padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer",
            background: tab === "orders" ? "#2d2260" : "#f0ede8",
            color: tab === "orders" ? "#ede9fd" : "#8a8580", fontSize: 12, fontWeight: 600,
          }}
        >
          Orders
        </button>
      </div>

      {/* Main */}
      {tab === "new-order" ? (
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16, padding: 16, minHeight: 0 }}>
          {/* Menu */}
          <div style={{ background: "#fff", border: "1px solid #e8e4dc", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", minHeight: 0 }}>
            {loading ? (
              <div style={{ color: "#8a8580", fontSize: 13 }}>Loading menu…</div>
            ) : error && products.length === 0 ? (
              <div style={{ color: "#c0392b", fontSize: 13 }}>Couldn't load menu: {error}</div>
            ) : products.length === 0 ? (
              <div style={{ color: "#a8a39c", fontSize: 13 }}>
                No products found. Add some under Products Management first.
              </div>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#a8a39c", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    🥤 Cups left
                  </span>
                  {SIZES.map((size) => {
                    const c = cupStock[size];
                    if (!c) return null;
                    const out = c.stock <= 0;
                    const low = !out && c.stock <= c.min;
                    return (
                      <span
                        key={size}
                        style={{
                          fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 20,
                          background: out ? "#fef2f2" : low ? "#fff7ed" : "#f0fdf4",
                          color: out ? "#dc2626" : low ? "#b45309" : "#166534",
                        }}
                      >
                        {CUP_LABEL[size]} ({size}): {out ? "Out" : c.stock}
                      </span>
                    );
                  })}
                </div>
                <div style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto", paddingBottom: 4 }}>
                  {categories.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCategory(c)}
                      style={{
                        padding: "7px 16px", borderRadius: 8, border: "none", whiteSpace: "nowrap",
                        background: category === c ? "#2d2260" : "#f5f3ee",
                        color: category === c ? "#ede9fd" : "#8a8580",
                        fontSize: 13, fontWeight: category === c ? 600 : 500, cursor: "pointer",
                      }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <div style={{ flex: 1, overflowY: "auto", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10, alignContent: "start" }}>
                  {visibleProducts.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleProductClick(p)}
                      style={{
                        padding: "16px 12px", borderRadius: 10, border: "1px solid #e8e4dc",
                        background: "#fdfcfa", textAlign: "left", cursor: "pointer",
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1814", marginBottom: 6 }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: "#8a8580" }}>
                        {needsSize(p) ? `from ${peso(p.price || 0)}` : peso(p.price || 0)}
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Cart */}
          <div style={{ background: "#fff", border: "1px solid #e8e4dc", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1814", marginBottom: 12 }}>Current Order</div>

            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
              {cart.length === 0 ? (
                <div style={{ fontSize: 13, color: "#a8a39c" }}>Tap items from the menu to add them here.</div>
              ) : (
                cart.map((item) => (
                  <div key={item.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#1a1814" }}>{item.name}</div>
                      <div style={{ fontSize: 11, color: "#a8a39c" }}>{peso(item.price)} each</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <button onClick={() => changeQty(item.key, -1)} style={qtyBtnStyle}>−</button>
                      <span style={{ fontSize: 13, fontWeight: 600, minWidth: 18, textAlign: "center" }}>{item.quantity}</span>
                      <button onClick={() => changeQty(item.key, 1)} style={qtyBtnStyle}>+</button>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1814", minWidth: 64, textAlign: "right" }}>
                      {peso(item.price * item.quantity)}
                    </div>
                    <button onClick={() => removeItem(item.key)} style={{ border: "none", background: "transparent", color: "#c0392b", fontSize: 14, cursor: "pointer", padding: "0 2px" }}>
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>

            <div style={{ borderTop: "1px solid #e8e4dc", paddingTop: 14, marginTop: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: 700, color: "#1a1814", marginBottom: 14 }}>
                <span>Total</span>
                <span>{peso(total)}</span>
              </div>

              <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                <button
                  onClick={() => setPaymentMethod("cash")}
                  style={{ ...paymentBtnStyle, ...(paymentMethod === "cash" ? paymentBtnActive : {}) }}
                >
                  💵 Cash
                </button>
                <button
                  onClick={() => setPaymentMethod("qr")}
                  style={{ ...paymentBtnStyle, ...(paymentMethod === "qr" ? paymentBtnActive : {}) }}
                >
                  📷 Scan QR
                </button>
              </div>

              {error && <div style={{ fontSize: 12, color: "#c0392b", marginBottom: 10 }}>{error}</div>}

              <button
                onClick={handleCharge}
                disabled={cart.length === 0 || submitting}
                style={{
                  width: "100%", padding: "13px 0", borderRadius: 10, border: "none",
                  background: cart.length === 0 || submitting ? "#cfc8e8" : "#2d2260",
                  color: "#ede9fd", fontSize: 14, fontWeight: 700,
                  cursor: cart.length === 0 || submitting ? "not-allowed" : "pointer", marginBottom: 8,
                }}
              >
                {submitting ? "Processing…" : `Charge ${peso(total)}`}
              </button>

              <button
                onClick={clearCart}
                disabled={cart.length === 0 || submitting}
                style={{ width: "100%", padding: "9px 0", borderRadius: 10, border: "none", background: "transparent", color: "#a8a39c", fontSize: 12, cursor: cart.length === 0 ? "not-allowed" : "pointer" }}
              >
                Clear order
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", padding: 16, minHeight: 0 }}>
          <OrdersTab />
        </div>
      )}

      {lastOrder && (
        <div style={{ position: "fixed", bottom: 20, right: 20, background: "#3a8c5f", color: "#fff", padding: "12px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
          ✓ Order saved — {peso(lastOrder.total)} ({lastOrder.itemCount} item{lastOrder.itemCount === 1 ? "" : "s"})
        </div>
      )}

      {sizeFor && (
        <SizeModal
          product={sizeFor}
          cupStock={cupStock}
          onPick={(size) => addToCart(sizeFor, size)}
          onCancel={() => setSizeFor(null)}
        />
      )}

      {scanning && (
        <ScanToPayModal
          amount={total}
          submitting={submitting}
          onConfirm={(code) => completeOrder({ paymentRef: code })}
          onCancel={() => setScanning(false)}
        />
      )}
    </div>
  );
}

const qtyBtnStyle = {
  width: 22, height: 22, borderRadius: 6, border: "1px solid #e8e4dc", background: "#f5f3ee",
  color: "#1a1814", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex",
  alignItems: "center", justifyContent: "center", padding: 0, lineHeight: 1,
};

const paymentBtnStyle = {
  flex: 1, padding: "9px 0", borderRadius: 8, border: "1px solid #e8e4dc", background: "#fff",
  color: "#8a8580", fontSize: 13, fontWeight: 600, cursor: "pointer",
};

const paymentBtnActive = {
  background: "#2d2260", color: "#ede9fd", borderColor: "#2d2260",
};