import { ref, push, get, update } from "firebase/database";
import { rtdb } from "./firebase";

// Status flow: ordered → preparing → ready → completed
// Must stay in sync with POS STATUS_FLOW

export const placeCustomerOrder = async (orderData) => {
  const orderRef = push(ref(rtdb, "customerOrders"));

  const order = {
    customerId:   orderData.customerId,
    customerName: orderData.customerName,
    items: orderData.items.map(i => ({
      productId:  i.productId,
      name:       i.name,
      size:       i.size   || null,
      addons:     i.addons || [],
      pickupTime: i.pickupTime || null,
      price:      i.finalPrice,
      finalPrice: i.finalPrice,
      qty:        i.qty,
    })),
    subtotal:   orderData.subtotal,
    total:      orderData.total,
    pickupTime: orderData.items[0]?.pickupTime || null,
    note:       orderData.note || "",
    status:     "ordered",   // matches what's already in Firebase
    createdAt:  Date.now(),
  };

  await update(ref(rtdb), { [`customerOrders/${orderRef.key}`]: order });
  return orderRef;
};

export const getCustomerOrder = async (orderId) => {
  const snap = await get(ref(rtdb, `customerOrders/${orderId}`));
  if (!snap.exists()) return null;
  return { id: orderId, ...snap.val() };
};

export const getCustomerOrders = async (customerId) => {
  const snap = await get(ref(rtdb, "customerOrders"));
  if (!snap.exists()) return [];
  return Object.entries(snap.val())
    .map(([id, val]) => ({ id, ...val }))
    .filter(o => o.customerId === customerId)
    .sort((a, b) => b.createdAt - a.createdAt);
};

export const updateCustomerOrderStatus = async (orderId, status) => {
  await update(ref(rtdb, `customerOrders/${orderId}`), {
    status,
    updatedAt: Date.now(),
  });
};