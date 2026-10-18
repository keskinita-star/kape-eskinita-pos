// src/services/cupService.js
// Shared by the POS and the customer app. Deducts 1 cup per drink ordered,
// based on the size picked (Tall -> Small cup, Grande -> Medium cup, Venti -> Large cup).
// Cups are read from the database (/materials), so stock you edit in Inventory is what gets used.
import { ref, get, runTransaction } from "firebase/database";
import { rtdb } from "./firebase";

export const MATERIALS_PATH = "materials";

export const SIZES = ["Tall", "Grande", "Venti"];

// Display names for the cups behind each size
export const CUP_LABEL = { Tall: "Small", Grande: "Medium", Venti: "Large" };

/**
 * Find the cup materials in the database (/materials) instead of hard-coded ids.
 * A cup is any material in category "Cups & Lids" whose name contains
 * "small" / "medium" / "large" and "cup" (e.g. "Small Cups").
 * Returns { Tall: {id, stock, min, name}, Grande: {...}, Venti: {...} } (missing sizes are omitted).
 */
export function findCups(materialsVal = {}) {
  const rows = Object.entries(materialsVal || {}).map(([id, m]) => ({ id, ...m }));
  const out = {};
  for (const size of SIZES) {
    const word = CUP_LABEL[size].toLowerCase();
    const m = rows.find(
      (r) =>
        r.category === "Cups & Lids" &&
        String(r.name || "").toLowerCase().includes(word) &&
        String(r.name || "").toLowerCase().includes("cup")
    );
    if (m) out[size] = { id: m.id, name: m.name, stock: Number(m.stock) || 0, min: Number(m.minStock) || 0 };
  }
  return out;
}

// Extra price on top of the product's base price when the product has no custom `sizes`
export const DEFAULT_SIZE_ADD = { Tall: 0, Grande: 15, Venti: 25 };

// Categories that are served in a cup (no size / no cup for food)
export const NON_CUP_CATEGORIES = ["Snack and Rice Meal", "Food"];
export const needsSize = (product) => !NON_CUP_CATEGORIES.includes(product.category);

// Price of a product at a given size
export function priceForSize(product, size) {
  const custom = product.hasSizes && Array.isArray(product.sizes)
    ? product.sizes.find((s) => s.label === size)
    : null;
  if (custom) return Number(custom.price) || 0;
  return (Number(product.price) || 0) + (DEFAULT_SIZE_ADD[size] || 0);
}

/**
 * Deduct cups for a list of order items.
 * Works with both shapes:  { size, quantity }  (POS)  and  { size, qty }  (customer app).
 * Items without a size (e.g. food) are skipped. Stock never goes below 0.
 */
export async function deductCups(items = []) {
  // look up the cup materials live from the database
  const snap = await get(ref(rtdb, MATERIALS_PATH));
  const cups = findCups(snap.val());

  const totals = {};
  for (const it of items) {
    const matId = cups[it.size]?.id;
    if (!matId) continue;
    const n = Number(it.quantity ?? it.qty ?? 1) || 0;
    totals[matId] = (totals[matId] || 0) + n;
  }
  await Promise.all(
    Object.entries(totals).map(([matId, n]) =>
      runTransaction(ref(rtdb, `${MATERIALS_PATH}/${matId}/stock`), (cur) =>
        Math.max(0, (Number(cur) || 0) - n)
      )
    )
  );
  return totals;
}