import { ref, get, set, push, update, remove } from "firebase/database";
import { rtdb } from "./firebase";

export const getSchedules = async () => {
  const snap = await get(ref(rtdb, "schedules"));
  if (!snap.exists()) return [];
  return Object.entries(snap.val()).map(([id, val]) => ({ id, ...val }));
};

export const addSchedule = (schedule) =>
  push(ref(rtdb, "schedules"), schedule);

export const updateSchedule = (id, data) =>
  update(ref(rtdb, `schedules/${id}`), data);

export const deleteSchedule = (id) =>
  remove(ref(rtdb, `schedules/${id}`));