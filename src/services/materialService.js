import { ref, get, push, set, update, remove } from "firebase/database";
import { rtdb } from "./firebase";

const PATH = "materials";

// strip the client-side id so it never gets saved inside the record
const clean = ({ id, ...data }) => data;

export async function getMaterials() {
  const snap = await get(ref(rtdb, PATH));
  const val = snap.val() || {};
  return Object.entries(val)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
}

export async function addMaterial(data) {
  const r = push(ref(rtdb, PATH));
  await set(r, clean(data));
  return r.key;
}

export async function updateMaterial(id, data) {
  await update(ref(rtdb, `${PATH}/${id}`), clean(data));
}

export async function deleteMaterial(id) {
  await remove(ref(rtdb, `${PATH}/${id}`));
}