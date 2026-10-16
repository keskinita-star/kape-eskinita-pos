import { ref, push, get, update, remove } from "firebase/database";
import { rtdb } from "./firebase";

export const getMaterials = async () => {
  try {
    const snap = await get(ref(rtdb, "materials"));
    if (!snap.exists()) return [];
    return Object.entries(snap.val()).map(([id, val]) => ({ id, ...val }));
  } catch (error) {
    console.error("Error fetching materials:", error);
    return [];
  }
};

export const addMaterial = async (data) => {
  try {
    const newRef = push(ref(rtdb, "materials"));
    await update(ref(rtdb), {
      [`materials/${newRef.key}`]: {
        ...data,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    });
    return newRef.key;
  } catch (error) {
    console.error("Error adding material:", error);
    throw error;
  }
};

export const updateMaterial = async (id, data) => {
  try {
    await update(ref(rtdb, `materials/${id}`), {
      ...data,
      updatedAt: Date.now()
    });
  } catch (error) {
    console.error("Error updating material:", error);
    throw error;
  }
};

export const deleteMaterial = async (id) => {
  try {
    await remove(ref(rtdb, `materials/${id}`));
  } catch (error) {
    console.error("Error deleting material:", error);
    throw error;
  }
};