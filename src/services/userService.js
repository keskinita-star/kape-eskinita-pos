import { ref, get, set, update, remove } from "firebase/database";
import { rtdb } from "./firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase";

export const getUsers = async () => {
  const snap = await get(ref(rtdb, "users"));
  if (!snap.exists()) return [];
  return Object.entries(snap.val()).map(([id, val]) => ({ id, ...val }));
};

export const createUser = async ({ email, password, name, role }) => {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await set(ref(rtdb, `users/${cred.user.uid}`), { name, email, role });
  return cred.user.uid;
};

export const updateUser = (id, data) =>
  update(ref(rtdb, `users/${id}`), data);

export const deleteUser = (id) =>
  remove(ref(rtdb, `users/${id}`));