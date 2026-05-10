import { ref, push, get, update, remove } from "firebase/database";
import { rtdb } from "./firebase";

export const getIngredients = async () => {
  try {
    const snap = await get(ref(rtdb, "ingredients"));
    if (!snap.exists()) return [];
    return Object.entries(snap.val()).map(([id, val]) => ({ id, ...val }));
  } catch (error) {
    console.error("Error fetching ingredients:", error);
    return [];
  }
};

export const addIngredient = async (data) => {
  try {
    const newRef = push(ref(rtdb, "ingredients"));
    await update(ref(rtdb), {
      [`ingredients/${newRef.key}`]: { 
        ...data, 
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    });
    return newRef.key;
  } catch (error) {
    console.error("Error adding ingredient:", error);
    throw error;
  }
};

export const updateIngredient = async (id, data) => {
  try {
    await update(ref(rtdb, `ingredients/${id}`), {
      ...data,
      updatedAt: Date.now()
    });
  } catch (error) {
    console.error("Error updating ingredient:", error);
    throw error;
  }
};

export const deleteIngredient = async (id) => {
  try {
    await remove(ref(rtdb, `ingredients/${id}`));
  } catch (error) {
    console.error("Error deleting ingredient:", error);
    throw error;
  }
};