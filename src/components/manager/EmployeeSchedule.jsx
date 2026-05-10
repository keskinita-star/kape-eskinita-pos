import { useState, useEffect } from "react";
import { getSchedules, addSchedule, updateSchedule, deleteSchedule } from "../../services/scheduleService";
import { getUsers } from "../../services/userService";
import { DAYS } from "../../utils/constants";
import toast from "react-hot-toast";

const empty = { employeeId:"", employeeName:"", day:"Monday", startTime:"08:00", endTime:"17:00", note:"" };

export default function EmployeeSchedule() {
  const [schedules, setSchedules] = useState([]);
  const [cashiers, setCashiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewDay, setViewDay] = useState("All");

  const load = async () => {
    const [s, u] = await Promise.all([getSchedules(), getUsers()]);
    setSchedules(s); setCashiers(u.filter(u => u.role==="cashier")); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = viewDay === "All" ? schedules : schedules.filter(s => s.day === viewDay);

  const handleEmployeeChange = (uid) => {
    const emp = cashiers.find(c => c.id === uid);
    setForm(f => ({ ...f, employeeId:uid, employeeName:emp?.name||"" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editing) { await updateSchedule(editing, form); toast.success("Schedule updated!"); }
      else { await addSchedule(form); toast.success("Schedule added!"); }
      setForm(empty); setEditing(null); setShowForm(false); load();
    } catch { toast.error("Failed to save."); }
    finally { setSaving(false); }
  };

  const handleEdit = (s) => {
    setForm({ employeeId:s.employeeId, employeeName:s.employeeName, day:s.day, startTime:s.startTime, endTime:s.endTime, note:s.note||"" });
    setEditing(s.id); setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this schedule?")) return;
    await deleteSchedule(id); toast.success("Deleted."); load();
  };

  const inp = { width:"100%", padding:"9px 12px", border:"1px solid #e8e2d9", borderRadius:8, fontSize:13, background:"#fdfcfb", outline:"none", color:"#1a1814", fontFamily:"inherit" };
  const lbl = { fontSize:11, fontWeight:600, color:"#9a9690", display:"block", marginBottom:5, textTransform:"uppercase", letterSpacing:"0.5px" };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <h2 style={{ fontSize:20, fontWeight:700, color:"#1a1814", letterSpacing:"-0.5px" }}>Employee Schedule</h2>
          <p style={{ fontSize:13, color:"#9a9690", marginTop:2 }}>{schedules.length} scheduled shifts</p>
        </div>
        <button onClick={() => { setForm(empty); setEditing(null); setShowForm(!showForm); }}
          style={{ padding:"9px 18px", borderRadius:10, background:showForm?"#f0ede8":"#1a1814", color:showForm?"#6b6860":"#fff", border:"none", fontSize:13, fontWeight:600, cursor:"pointer" }}>
          {showForm ? "✕ Cancel" : "+ Add Shift"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ background:"#fff", border:"1px solid #e8e2d9", borderRadius:12, padding:20, display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <div style={{ gridColumn:"1/-1", fontSize:14, fontWeight:700, color:"#1a1814" }}>{editing ? "Edit Shift" : "New Shift"}</div>
          <div style={{ gridColumn:"1/-1" }}>
            <label style={lbl}>Employee</label>
            <select style={inp} value={form.employeeId} onChange={e => handleEmployeeChange(e.target.value)} required>
              <option value="">Select employee...</option>
              {cashiers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {cashiers.length === 0 && <div style={{ fontSize:11, color:"#b45309", marginTop:4 }}>No cashiers found. Add cashier accounts in Admin panel.</div>}
          </div>
          <div>
            <label style={lbl}>Day</label>
            <select style={inp} value={form.day} onChange={e => setForm(f=>({...f,day:e.target.value}))}>
              {DAYS.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Note (optional)</label>
            <input style={inp} value={form.note} onChange={e => setForm(f=>({...f,note:e.target.value}))} placeholder="e.g. Opening shift" />
          </div>
          <div>
            <label style={lbl}>Start Time</label>
            <input type="time" style={inp} value={form.startTime} onChange={e => setForm(f=>({...f,startTime:e.target.value}))} required />
          </div>
          <div>
            <label style={lbl}>End Time</label>
            <input type="time" style={inp} value={form.endTime} onChange={e => setForm(f=>({...f,endTime:e.target.value}))} required />
          </div>
          <div style={{ gridColumn:"1/-1", display:"flex", gap:10 }}>
            <button type="submit" disabled={saving} style={{ padding:"10px 24px", borderRadius:10, background:saving?"#d0ccc4":"#1a1814", color:saving?"#9a9690":"#fff", border:"none", fontSize:13, fontWeight:600, cursor:saving?"not-allowed":"pointer" }}>
              {saving ? "Saving..." : editing ? "Save Changes" : "Add Shift"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} style={{ padding:"10px 18px", borderRadius:10, background:"none", border:"1px solid #e8e2d9", fontSize:13, color:"#6b6860", cursor:"pointer" }}>Cancel</button>
          </div>
        </form>
      )}

      {/* Day Filter */}
      <div style={{ display:"flex", gap:8, overflowX:"auto" }}>
        {["All",...DAYS].map(d => (
          <button key={d} onClick={() => setViewDay(d)}
            style={{ padding:"5px 12px", borderRadius:20, fontSize:12, fontWeight:500, border: viewDay===d?"1px solid #1a1814":"1px solid #e8e2d9", background: viewDay===d?"#1a1814":"transparent", color: viewDay===d?"#fff":"#6b6860", cursor:"pointer", whiteSpace:"nowrap" }}>
            {d}
          </button>
        ))}
      </div>

      {/* Schedule Grid */}
      {loading ? <p style={{ fontSize:13, color:"#9a9690" }}>Loading...</p> :
        filtered.length === 0 ? <p style={{ fontSize:13, color:"#9a9690" }}>No shifts scheduled.</p> : (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {filtered.sort((a,b) => DAYS.indexOf(a.day)-DAYS.indexOf(b.day)).map(s => (
            <div key={s.id} style={{ background:"#fff", border:"1px solid #e8e2d9", borderRadius:10, padding:"12px 16px", display:"flex", alignItems:"center", gap:16 }}>
              <div style={{ minWidth:90 }}>
                <span style={{ fontSize:11, padding:"3px 10px", borderRadius:20, background:"#f0ede8", color:"#6b6860", fontWeight:600 }}>{s.day}</span>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600, color:"#1a1814" }}>{s.employeeName}</div>
                {s.note && <div style={{ fontSize:11, color:"#9a9690" }}>{s.note}</div>}
              </div>
              <div style={{ fontSize:13, color:"#4a3d8f", fontWeight:600 }}>🕐 {s.startTime} – {s.endTime}</div>
              <div style={{ display:"flex", gap:6 }}>
                <button onClick={() => handleEdit(s)} style={{ padding:"5px 10px", borderRadius:6, border:"1px solid #e8e2d9", background:"none", fontSize:12, color:"#1a1814", cursor:"pointer" }}>Edit</button>
                <button onClick={() => handleDelete(s.id)} style={{ padding:"5px 10px", borderRadius:6, border:"1px solid #fca5a5", background:"none", fontSize:12, color:"#dc2626", cursor:"pointer" }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}