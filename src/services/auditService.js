import { ref, push, get } from "firebase/database";
import { rtdb } from "./firebase";

export const logAction = async (userId, userName, action, details = "") => {
  await push(ref(rtdb, "audit_logs"), {
    userId,
    userName,
    action,
    details,
    timestamp: Date.now(),
  });
};

export const getAuditLogs = async (limit = 200) => {
  const snap = await get(ref(rtdb, "audit_logs"));
  if (!snap.exists()) return [];
  return Object.entries(snap.val())
    .map(([id, val]) => ({ id, ...val }))
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
};