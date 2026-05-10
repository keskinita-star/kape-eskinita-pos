import { ref, get, set, update, remove } from "firebase/database";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, rtdb } from "./firebase";

export const getUsers = async () => {
  const usersSnap     = await get(ref(rtdb, "users"));
  const customersSnap = await get(ref(rtdb, "customers"));

  const users = usersSnap.exists()
    ? Object.entries(usersSnap.val()).map(([id, val]) => ({ id, ...val }))
    : [];

  const customers = customersSnap.exists()
    ? Object.entries(customersSnap.val()).map(([id, val]) => ({ id, ...val }))
    : [];

  return [...users, ...customers];
};

export const createUser = async ({ name, email, password, role }) => {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await set(ref(rtdb, `users/${cred.user.uid}`), {
    uid: cred.user.uid,
    name,
    email,
    role,
    createdAt: Date.now(),
  });
  return cred.user.uid;
};

export const updateUser = async (id, fields) => {
  await update(ref(rtdb, `users/${id}`), fields);
};

export const deleteUser = async (id) => {
  await remove(ref(rtdb, `users/${id}`));
};