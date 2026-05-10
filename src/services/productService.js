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
  // Fetch all ingredients from RTDB
  const snap = await get(ref(rtdb, "ingredients"));
  const ingredients = snap.exists() ? snap.val() : {};

  return products.map((product) => {
    // If the product has no ingredient requirements, it's always available
    if (!product.ingredients || product.ingredients.length === 0) {
      return { ...product, available: true, blockedBy: [] };
    }

    // Find which required ingredients are out of stock
    const blockedBy = product.ingredients.filter((ingredientId) => {
      const ingredient = ingredients[ingredientId];
      return !ingredient || ingredient.stock <= 0;
    });

    return {
      ...product,
      available: blockedBy.length === 0,
      // Map IDs to names for the toast message in POS.jsx
      blockedBy: blockedBy.map(
        (id) => ingredients[id]?.name || id
      ),
    };
  });
};