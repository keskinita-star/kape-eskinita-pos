import { ref, get, set } from "firebase/database";
import { rtdb } from "./firebase";

export const getSettings = async () => {
  const snap = await get(ref(rtdb, "settings"));
  if (!snap.exists()) return {};
  return snap.val();
};

export const saveSettings = (settings) =>
  set(ref(rtdb, "settings"), settings);