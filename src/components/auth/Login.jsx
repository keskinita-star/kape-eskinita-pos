import { useState } from "react";
import { loginUser } from "../../services/authService";
import { useAuth } from "../../contexts/AuthContext";
import toast from "react-hot-toast";

export default function Login() {
  const { setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await loginUser(email, password);
      setUser(user);
      toast.success(`Welcome back, ${user.name}!`);
    } catch (err) {
      toast.error("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#f5f3ee" }}>
      <div style={{ background:"#fff", border:"0.5px solid #e0ddd5", borderRadius:16, padding:"40px 36px", width:"100%", maxWidth:400 }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ fontSize:40, marginBottom:8 }}>☕</div>
          <h1 style={{ fontSize:22, fontWeight:600, color:"#1a1814", letterSpacing:"-0.5px" }}>Kape Eskinita</h1>
          <p style={{ fontSize:13, color:"#9a9690", marginTop:4 }}>Point of Sale System</p>
        </div>
        <form onSubmit={handleLogin} style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <label style={{ fontSize:12, fontWeight:500, color:"#6b6860", display:"block", marginBottom:6 }}>Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              style={{ width:"100%", padding:"10px 12px", border:"0.5px solid #d0ccc4", borderRadius:8, fontSize:14, outline:"none", background:"#faf9f6" }}
              placeholder="you@kapeeskinita.com"
            />
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:500, color:"#6b6860", display:"block", marginBottom:6 }}>Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)} required
              style={{ width:"100%", padding:"10px 12px", border:"0.5px solid #d0ccc4", borderRadius:8, fontSize:14, outline:"none", background:"#faf9f6" }}
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit" disabled={loading}
            style={{ marginTop:8, padding:"11px", borderRadius:8, background: loading ? "#d0ccc4" : "#2d2260", color:"#ede9fd", border:"none", fontSize:14, fontWeight:600 }}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}