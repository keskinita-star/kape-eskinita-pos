import { ref, get, set, push, update, remove } from "firebase/database";
import { rtdb } from "./firebase";

export const getProducts = async () => {
  const snap = await get(ref(rtdb, "products"));
  if (!snap.exists()) return [];
  return Object.entries(snap.val()).map(([id, val]) => ({ id, ...val }));
};

export const addProduct = (product) =>
  push(ref(rtdb, "products"), product);

export const updateProduct = (id, data) =>
  update(ref(rtdb, `products/${id}`), data);

export const deleteProduct = (id) =>
  remove(ref(rtdb, `products/${id}`));