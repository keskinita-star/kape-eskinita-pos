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

export const checkProductAvailability = async (products) => {
  // Fetch all materials from RTDB
  const snap = await get(ref(rtdb, "materials"));
  const materialsMap = snap.exists() ? snap.val() : {};

  return products.map((product) => {
    // No material requirements — always available
    if (!product.materials || product.materials.length === 0) {
      return { ...product, available: true, blockedBy: [] };
    }

    // Find which required materials are out of stock
    const blockedBy = product.materials.filter(({ materialId }) => {
      const material = materialsMap[materialId];
      return !material || Number(material.stock) <= 0;
    });

    return {
      ...product,
      available: blockedBy.length === 0,
      blockedBy: blockedBy.map(
        ({ materialId }) => materialsMap[materialId]?.name || materialId
      ),
    };
  });
};