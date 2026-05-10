import { useState, useEffect } from "react";
import { getUsers, createUser, updateUser, deleteUser } from "../../services/userService";
import { useAuth } from "../../contexts/AuthContext";
import { logAction } from "../../services/auditService";
import { formatDateTime } from "../../utils/formatters";
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
      await logAction(currentUser.uid, currentUser.name, "CREATE_USER", `Created ${form.role}: ${form.name} (${form.email})`);
      toast.success("User created!"); setForm(empty); setShowForm(false); load();
    } catch (err) { toast.error(err.message || "Failed to create user."); }
    finally { setSaving(false); }
  };

  const handleToggleRole = async (u) => {
    const newRole = u.role === "cashier" ? "manager" : "cashier";
    await updateUser(u.id, { role: newRole });
    await logAction(currentUser.uid, currentUser.name, "UPDATE_USER_ROLE", `Changed ${u.name} role to ${newRole}`);
    toast.success("Role updated."); load();
  };

  const handleDelete = async (u) => {
    if (u.id === currentUser.uid) return toast.error("You can't delete yourself.");
    if (!confirm(`Delete user "${u.name}"?`)) return;
    await deleteUser(u.id);
    await logAction(currentUser.uid, currentUser.name, "DELETE_USER", `Deleted user: ${u.name} (${u.email})`);
    toast.success("User deleted."); load();
  };

  const inp = { width:"100%", padding:"9px 12px", border:"1px solid #e8e2d9", borderRadius:8, fontSize:13, background:"#fdfcfb", outline:"none", color:"#1a1814", fontFamily:"inherit" };
  const lbl = { fontSize:11, fontWeight:600, color:"#9a9690", display:"block", marginBottom:5, textTransform:"uppercase", letterSpacing:"0.5px" };

  const roleColor = (role) => ({
  admin: { bg:"#eeeaf9", color:"#4a3d8f" },
  manager: { bg:"#fef9c3", color:"#854d0e" },
  cashier: { bg:"#f0fdf4", color:"#166534" },
  customer: { bg:"#e0f2fe", color:"#0369a1" },
}[role] || { bg:"#f5f3ee", color:"#6b6860" });

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <h2 style={{ fontSize:20, fontWeight:700, color:"#1a1814", letterSpacing:"-0.5px" }}>User Accounts</h2>
          <p style={{ fontSize:13, color:"#9a9690", marginTop:2 }}>{users.length} total users</p>
        </div>
        <button onClick={() => { setForm(empty); setShowForm(!showForm); }}
          style={{ padding:"9px 18px", borderRadius:10, background:showForm?"#f0ede8":"#1a1814", color:showForm?"#6b6860":"#fff", border:"none", fontSize:13, fontWeight:600, cursor:"pointer" }}>
          {showForm ? "✕ Cancel" : "+ Add User"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ background:"#fff", border:"1px solid #e8e2d9", borderRadius:12, padding:20, display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <div style={{ gridColumn:"1/-1", fontSize:14, fontWeight:700, color:"#1a1814" }}>New User</div>
          <div>
            <label style={lbl}>Full Name</label>
            <input style={inp} value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="Juan Dela Cruz" required />
          </div>
          <div>
            <label style={lbl}>Email</label>
            <input type="email" style={inp} value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} placeholder="juan@kape.com" required />
          </div>
          <div>
            <label style={lbl}>Password</label>
            <input type="password" style={inp} value={form.password} onChange={e => setForm(f=>({...f,password:e.target.value}))} placeholder="Min 6 characters" required minLength={6} />
          </div>
          <div>
            <label style={lbl}>Role</label>
            <select style={inp} value={form.role} onChange={e => setForm(f=>({...f,role:e.target.value}))}>
              <option value="cashier">Cashier</option>
              <option value="manager">Manager (Owner)</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div style={{ gridColumn:"1/-1", display:"flex", gap:10 }}>
            <button type="submit" disabled={saving}
              style={{ padding:"10px 24px", borderRadius:10, background:saving?"#d0ccc4":"#1a1814", color:saving?"#9a9690":"#fff", border:"none", fontSize:13, fontWeight:600, cursor:saving?"not-allowed":"pointer" }}>
              {saving ? "Creating..." : "Create User"}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              style={{ padding:"10px 18px", borderRadius:10, background:"none", border:"1px solid #e8e2d9", fontSize:13, color:"#6b6860", cursor:"pointer" }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Users Table */}
      {loading ? <p style={{ fontSize:13, color:"#9a9690" }}>Loading...</p> : (
        <div style={{ background:"#fff", border:"1px solid #e8e2d9", borderRadius:12, overflow:"hidden" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead>
              <tr style={{ background:"#f5f3ee" }}>
                {["Name","Email","Role","Actions"].map(h => (
                  <th key={h} style={{ padding:"10px 16px", textAlign:"left", fontSize:11, fontWeight:600, color:"#9a9690", borderBottom:"1px solid #e8e2d9", textTransform:"uppercase", letterSpacing:"0.5px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const rc = roleColor(u.role);
                return (
                  <tr key={u.id} style={{ borderBottom:"1px solid #f5f3ee" }}>
                    <td style={{ padding:"12px 16px" }}>
                      <div style={{ fontWeight:600, color:"#1a1814" }}>{u.name}</div>
                      {u.id === currentUser.uid && <div style={{ fontSize:10, color:"#9a9690" }}>You</div>}
                    </td>
                    <td style={{ padding:"12px 16px", color:"#6b6860" }}>{u.email}</td>
                    <td style={{ padding:"12px 16px" }}>
                      <span style={{ fontSize:11, padding:"3px 10px", borderRadius:20, fontWeight:600, background:rc.bg, color:rc.color }}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding:"12px 16px" }}>
                      {u.id !== currentUser.uid && (
                        <div style={{ display:"flex", gap:6 }}>
                          {u.role !== "admin" && (
                            <button onClick={() => handleToggleRole(u)}
                              style={{ padding:"5px 10px", borderRadius:6, border:"1px solid #e8e2d9", background:"none", fontSize:11, color:"#1a1814", cursor:"pointer", fontWeight:500 }}>
                              Make {u.role === "cashier" ? "Manager" : "Cashier"}
                            </button>
                          )}
                          <button onClick={() => handleDelete(u)}
                            style={{ padding:"5px 10px", borderRadius:6, border:"1px solid #fca5a5", background:"none", fontSize:11, color:"#dc2626", cursor:"pointer", fontWeight:500 }}>
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}