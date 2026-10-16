import { ref, push, get, update, query, orderByChild, startAt, onValue } from "firebase/database";
import { rtdb } from "./firebase";

export const placeOrder = async (order) => {
  const orderRef = push(ref(rtdb, "orders"));
  const updates = {};

  updates[`orders/${orderRef.key}`] = { ...order, createdAt: Date.now() };

  for (const item of order.items) {
    // ── Deduct product stock ──────────────────────────────────────────────────
    const productSnap = await get(ref(rtdb, `products/${item.id}`));
    if (!productSnap.exists()) continue;
    const product = productSnap.val();
    const currentStock = product.stock ?? 0;
    updates[`products/${item.id}/stock`] = Math.max(0, currentStock - item.qty);

    // ── Deduct material stock ─────────────────────────────────────────────────
    const productMaterials = product.materials || [];
    for (const mat of productMaterials) {
      if (!mat.materialId || !mat.qty) continue;

      const matSnap = await get(ref(rtdb, `materials/${mat.materialId}`));
      if (!matSnap.exists()) continue;

      const currentMatStock = matSnap.val().stock ?? 0;
      const deductAmount = mat.qty * item.qty; // qty per drink × drinks ordered
      const key = `materials/${mat.materialId}/stock`;

      // Accumulate if same material used by multiple products in same order
      const alreadyDeducted = updates[key] !== undefined
        ? currentMatStock - updates[key]
        : 0;
      updates[key] = Math.max(0, currentMatStock - alreadyDeducted - deductAmount);
    }
  }

  await update(ref(rtdb), updates);
  return orderRef.key;
};

export const getOrders = async () => {
  const snap = await get(ref(rtdb, "orders"));
  if (!snap.exists()) return [];
  return Object.entries(snap.val()).map(([id, val]) => ({ id, ...val }));
};

export const getOrdersSince = async (timestamp) => {
  const q = query(ref(rtdb, "orders"), orderByChild("createdAt"), startAt(timestamp));
  const snap = await get(q);
  if (!snap.exists()) return [];
  return Object.entries(snap.val()).map(([id, val]) => ({ id, ...val }));
};

export const updateOrderStatus = async (orderId, status) => {
  await update(ref(rtdb, `orders/${orderId}`), {
    status,
    updatedAt: Date.now(),
  });
};

export const subscribeToOrders = (callback) => {
  const ordersRef = ref(rtdb, "orders");
  return onValue(ordersRef, (snap) => {
    if (!snap.exists()) {
      callback([]);
      return;
    }
    callback(Object.entries(snap.val()).map(([id, val]) => ({ id, ...val })));
  });
};