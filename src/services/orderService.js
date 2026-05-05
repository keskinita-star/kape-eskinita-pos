import { ref, push, get, update, query, orderByChild, startAt } from "firebase/database";
import { rtdb } from "./firebase";

// ✅ only this function changed
export const placeOrder = async (order) => {
  const orderRef = push(ref(rtdb, "orders"));
  const updates = {};

  updates[`orders/${orderRef.key}`] = { ...order, createdAt: Date.now() };

  for (const item of order.items) {
    const productSnap = await get(ref(rtdb, `products/${item.id}`));
    if (!productSnap.exists()) continue;
    const currentStock = productSnap.val().stock ?? 0;
    updates[`products/${item.id}/stock`] = Math.max(0, currentStock - item.qty);
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