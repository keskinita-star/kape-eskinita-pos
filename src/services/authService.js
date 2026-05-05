import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { ref, get } from "firebase/database";
import { auth, rtdb } from "./firebase";

export const loginUser = async (email, password) => {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const snap = await get(ref(rtdb, `users/${cred.user.uid}`));
  if (!snap.exists()) throw new Error("User record not found.");
  return { uid: cred.user.uid, ...snap.val() };
};

export const logoutUser = () => signOut(auth);