// src/components/RoleRouter.jsx
import { useEffect, useState } from "react";
import { auth } from "../firebase/config";
import { onAuthStateChanged } from "firebase/auth";
import { ref, get } from "firebase/database";
import { rtdb } from "../firebase/config";
import POS from "./POS";
import AdminDashboard from "./AdminDashboard";
import KitchenDashboard from "./KitchenDashboard";
import LoadingScreen from "./LoadingScreen";

export default function RoleRouter() {
  const [userRole, setUserRole] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Fetch user role from database
        const userRef = ref(rtdb, `users/${user.uid}`);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
          const userData = snapshot.val();
          setUserRole(userData.role);
          setCurrentUser({
            uid: user.uid,
            ...userData
          });
        }
      } else {
        setUserRole(null);
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await auth.signOut();
    setUserRole(null);
    setCurrentUser(null);
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (!userRole) {
    // Redirect to login page
    window.location.href = '/login';
    return null;
  }

  // Automatic routing based on user role
  switch(userRole) {
    case 'admin':
    case 'owner':
      return <AdminDashboard currentUser={currentUser} onLogout={handleLogout} />;
    
    case 'cashier':
      return <POS userRole={userRole} currentUser={currentUser} onLogout={handleLogout} />;
    
    case 'kitchen':
      return <KitchenDashboard currentUser={currentUser} onLogout={handleLogout} />;
    
    default:
      return <POS userRole={userRole} currentUser={currentUser} onLogout={handleLogout} />;
  }
}