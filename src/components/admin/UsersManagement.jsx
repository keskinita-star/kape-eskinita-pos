import { useState, useEffect } from "react";
import { getUsers, createUser, deleteUser } from "../../services/userService";
import { useAuth } from "../../contexts/AuthContext";
import toast from "react-hot-toast";

const empty = { name:"", email:"", password:"", role:"cashier" };

export default function UsersManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(empty);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () => getUsers().then(u => { setUsers(u); setLoading(false); });
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await createUser(form);
      toast.success("User created!"); setForm(empty); setShowForm(false); load();
    } catch (err) { toast.error(err.message || "Failed to create user."); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (id === currentUser.uid) return toast.error("You can't delete yourself.");
    if (!confirm("Delete this user?")) return;
    await deleteUser(id); toast.success("User deleted."); load();
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <h2 style={{ fontSize:18, fontWeight:600, color:"#1a1814", letterSpacing:"-0.3px" }}>Users</h2>
        <button onClick={() => setShowForm(!showForm)}
          style={{ padding:"8px 16px", borderRadius:8, background:"#2d2260", color:"#ede9fd", border:"none", fontSize:13, fontWeight:600 }}>
          {showForm ? "Cancel" : "+ Add User"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ background:"#fff", border:"0.5px solid #e0ddd5", borderRadius:12, padding:20, display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <div style={{ gridColumn:"1/-1", fontSize:14, fontWeight:600, color:"#1a1814" }}>New User</div>
          {[["name","Full name","text"],["email","Email","email"],["password","Password","password"]].map(([field, label, type]) => (
            <div key={field}>
              <label style={{ fontSize:12, color:"#6b6860", display:"block", marginBottom:4 }}>{label}</label>
              <input type={type} value={form[field]} onChange={e => setForm(f => ({ ...f, [field]:e.target.value }))} required
                style={{ width:"100%", padding:"8px 10px", border:"0.5px solid #d0ccc4", borderRadius:8, fontSize:13, background:"#faf9f6" }} />
            </div>
          ))}
          <div>
            <label style={{ fontSize:12, color:"#6b6860", display:"block", marginBottom:4 }}>Role</label>
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role:e.target.value }))}
              style={{ width:"100%", padding:"8px 10px", border:"0.5px solid #d0ccc4", borderRadius:8, fontSize:13, background:"#faf9f6" }}>
              <option value="cashier">Cashier</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div style={{ gridColumn:"1/-1" }}>
            <button type="submit" disabled={saving}
              style={{ padding:"9px 20px", borderRadius:8, background: saving ? "#d0ccc4" : "#2d2260", color: saving ? "#9a9690" : "#ede9fd", border:"none", fontSize:13, fontWeight:600 }}>
              {saving ? "Creating..." : "Create User"}
            </button>
          </div>
        </form>
      )}

      {loading ? <p style={{ fontSize:13, color:"#9a9690" }}>Loading...</p> : (
        <div style={{ background:"#fff", border:"0.5px solid #e0ddd5", borderRadius:12, overflow:"hidden" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead>
              <tr style={{ background:"#f5f3ee" }}>
                {["Name","Email","Role",""].map(h => (
                  <th key={h} style={{ padding:"10px 14px", textAlign:"left", fontSize:11, fontWeight:600, color:"#9a9690", borderBottom:"0.5px solid #e0ddd5" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom:"0.5px solid #f0ede8" }}>
                  <td style={{ padding:"10px 14px", fontWeight:500, color:"#1a1814" }}>{u.name}</td>
                  <td style={{ padding:"10px 14px", color:"#6b6860" }}>{u.email}</td>
                  <td style={{ padding:"10px 14px" }}>
                    <span style={{ fontSize:11, padding:"3px 10px", borderRadius:20, fontWeight:500, background: u.role==="admin" ? "#eeeaf9" : "#f0fdf4", color: u.role==="admin" ? "#4a3d8f" : "#166534" }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding:"10px 14px" }}>
                    {u.id !== currentUser.uid && (
                      <button onClick={() => handleDelete(u.id)} style={{ fontSize:12, color:"#dc2626", background:"none", border:"0.5px solid #fca5a5", borderRadius:6, padding:"3px 10px" }}>Delete</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}