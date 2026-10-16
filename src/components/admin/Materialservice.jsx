import { ref, push, get, update, remove } from "firebase/database";
import { rtdb } from "./firebase";

export const getMaterials = async () => {
  const snap = await get(ref(rtdb, "materials"));
  if (!snap.exists()) return [];
  return Object.entries(snap.val()).map(([id, val]) => ({ id, ...val }));
};

export const addMaterial = async (data) => {
  const newRef = push(ref(rtdb, "materials"));
  await update(ref(rtdb, `materials/${newRef.key}`), data);
  return newRef.key;
};

export const updateMaterial = async (id, data) => {
  await update(ref(rtdb, `materials/${id}`), data);
};

export const deleteMaterial = async (id) => {
  await remove(ref(rtdb, `materials/${id}`));
};