// src/components/auth/Login.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { ref, get } from "firebase/database";
import { auth, rtdb } from "../../services/firebase";

const ADMIN_ROLES = ["admin", "owner"];

function getHomeForRole(role) {
  if (ADMIN_ROLES.includes(role)) return "/admin";
  if (role === "cashier") return "/cashier";
  return "/login";
}

export default function Login() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { user: fbUser } = await signInWithEmailAndPassword(auth, email, password);

      // Fetch role directly here so we can route immediately —
      // don't rely on onAuthStateChanged async timing
      const snap = await get(ref(rtdb, `users/${fbUser.uid}`));
      const role = snap.exists() ? (snap.val().role || "cashier") : "cashier";

      navigate(getHomeForRole(role), { replace: true });
    } catch (err) {
      console.error("Login error:", err);
      switch (err.code) {
        case "auth/invalid-credential":
        case "auth/user-not-found":
        case "auth/wrong-password":
          setError("Invalid email or password");
          break;
        default:
          setError("Failed to login. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex",
      alignItems: "center", justifyContent: "center",
      background: "#f5f3ee",
    }}>
      <div style={{
        background: "#fff", padding: "2rem", borderRadius: 12,
        boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
        width: "100%", maxWidth: 400,
      }}>
        <h1 style={{ textAlign: "center", marginBottom: "1rem", color: "#1a1814" }}>
          Kape Eskinita
        </h1>
        <h2 style={{ textAlign: "center", marginBottom: "2rem", fontSize: "1.25rem", color: "#6b6860" }}>
          Staff Login
        </h2>

        {error && (
          <div style={{
            background: "#fee", color: "#c33", padding: "0.75rem",
            borderRadius: 6, marginBottom: "1rem", textAlign: "center", fontSize: 14,
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{
                width: "100%", padding: "0.75rem", border: "1px solid #ddd",
                borderRadius: 6, fontSize: "1rem", boxSizing: "border-box",
              }}
              placeholder="staff@kapeeskinita.com"
            />
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{
                width: "100%", padding: "0.75rem", border: "1px solid #ddd",
                borderRadius: 6, fontSize: "1rem", boxSizing: "border-box",
              }}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", padding: "0.75rem",
              background: loading ? "#9a9690" : "#1a1814",
              color: "#fff", border: "none", borderRadius: 6,
              fontSize: "1rem", fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "background 0.15s",
            }}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}