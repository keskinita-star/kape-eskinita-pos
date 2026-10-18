import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBfi-oafnbwikpybvouxTYRM7xcpNwfHsM",
  authDomain: "kapeeskinita-d4fba.firebaseapp.com",
  databaseURL: "https://kapeeskinita-d4fba-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "kapeeskinita-d4fba",
  storageBucket: "kapeeskinita-d4fba.firebasestorage.app",
  messagingSenderId: "9417847909",
  appId: "1:9417847909:web:b63538380fafaf49bf028c",
  measurementId: "G-QHNEGYMZWY"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);
export default app;