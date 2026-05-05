import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAf11niFcK0doWD1RAkzJvTA8pl0-FRcXM",
  authDomain: "kape-eskinita-pos.firebaseapp.com",
  databaseURL: "https://kape-eskinita-pos-default-rtdb.firebaseio.com",
  projectId: "kape-eskinita-pos",
  storageBucket: "kape-eskinita-pos.firebasestorage.app",
  messagingSenderId: "26132154466",
  appId: "1:26132154466:web:6d8472984ca1159bf7293b"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const rtdb = getDatabase(app);