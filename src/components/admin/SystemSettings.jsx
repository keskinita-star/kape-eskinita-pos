import { useState, useEffect } from "react";
import { getSettings, saveSettings } from "../../services/settingsService";
import { useAuth } from "../../contexts/AuthContext";
import { logAction } from "../../services/auditService";
import toast from "react-hot-toast";

const defaults = {
  shopName: "Kape Eskinita",
  address: "",
  contactNumber: "",
  taxRate: 12,
  currency: "PHP",
  receiptFooter: "Thank you for visiting Kape Eskinita!",
  lowStockThreshold: 10,
  openTime: "07:00",
  closeTime: "21:00",
};

export default function SystemSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSettings().then(s => { setSettings({ ...defaults, ...s }); setLoading(false); });
  }, []);

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await saveSettings(settings);
      await logAction(user.uid, user.name, "UPDATE_SETTINGS", "System settings updated");
      toast.success("Settings saved!");
    } catch { toast.error("Failed to save settings."); }
    finally { setSaving(false); }
  };

  const inp = { width:"100%", padding:"9px 12px", border:"1px solid #e8e2d9", borderRadius:8, fontSize:13, background:"#fdfcfb", outline:"none", color:"#1a1814", fontFamily:"inherit" };
  const lbl = { fontSize:11, fontWeight:600, color:"#9a9690", display:"block", marginBottom:5, textTransform:"uppercase", letterSpacing:"0.5px" };

  if (loading) return <p style={{ fontSize:13, color:"#9a9690" }}>Loading...</p>;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:24, maxWidth:640 }}>
      <div>
        <h2 style={{ fontSize:20, fontWeight:700, color:"#1a1814", letterSpacing:"-0.5px" }}>System Settings</h2>
        <p style={{ fontSize:13, color:"#9a9690", marginTop:2 }}>Configure your POS system</p>
      </div>

      <form onSubmit={handleSave} style={{ display:"flex", flexDirection:"column", gap:20 }}>

        {/* Shop Info */}
        <div style={{ background:"#fff", border:"1px solid #e8e2d9", borderRadius:12, padding:20 }}>
          <div style={{ fontSize:14, fontWeight:600, color:"#1a1814", marginBottom:16 }}>Shop Information</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <div style={{ gridColumn:"1/-1" }}>
              <label style={lbl}>Shop Name</label>
              <input style={inp} value={settings.shopName} onChange={e => setSettings(s=>({...s,shopName:e.target.value}))} />
            </div>
            <div style={{ gridColumn:"1/-1" }}>
              <label style={lbl}>Address</label>
              <input style={inp} value={settings.address} onChange={e => setSettings(s=>({...s,address:e.target.value}))} placeholder="123 Coffee St, Quezon City" />
            </div>
            <div>
              <label style={lbl}>Contact Number</label>
              <input style={inp} value={settings.contactNumber} onChange={e => setSettings(s=>({...s,contactNumber:e.target.value}))} placeholder="+63 912 345 6789" />
            </div>
            <div>
              <label style={lbl}>Currency</label>
              <select style={inp} value={settings.currency} onChange={e => setSettings(s=>({...s,currency:e.target.value}))}>
                <option value="PHP">PHP — Philippine Peso (₱)</option>
                <option value="USD">USD — US Dollar ($)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Operating Hours */}
        <div style={{ background:"#fff", border:"1px solid #e8e2d9", borderRadius:12, padding:20 }}>
          <div style={{ fontSize:14, fontWeight:600, color:"#1a1814", marginBottom:16 }}>Operating Hours</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <div>
              <label style={lbl}>Opening Time</label>
              <input type="time" style={inp} value={settings.openTime} onChange={e => setSettings(s=>({...s,openTime:e.target.value}))} />
            </div>
            <div>
              <label style={lbl}>Closing Time</label>
              <input type="time" style={inp} value={settings.closeTime} onChange={e => setSettings(s=>({...s,closeTime:e.target.value}))} />
            </div>
          </div>
        </div>

        {/* POS Config */}
        <div style={{ background:"#fff", border:"1px solid #e8e2d9", borderRadius:12, padding:20 }}>
          <div style={{ fontSize:14, fontWeight:600, color:"#1a1814", marginBottom:16 }}>POS Configuration</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <div>
              <label style={lbl}>Tax Rate (%)</label>
              <input type="number" min="0" max="100" style={inp} value={settings.taxRate} onChange={e => setSettings(s=>({...s,taxRate:Number(e.target.value)}))} />
            </div>
            <div>
              <label style={lbl}>Low Stock Threshold</label>
              <input type="number" min="1" style={inp} value={settings.lowStockThreshold} onChange={e => setSettings(s=>({...s,lowStockThreshold:Number(e.target.value)}))} />
            </div>
            <div style={{ gridColumn:"1/-1" }}>
              <label style={lbl}>Receipt Footer Message</label>
              <textarea style={{ ...inp, resize:"none", height:70 }} value={settings.receiptFooter} onChange={e => setSettings(s=>({...s,receiptFooter:e.target.value}))} />
            </div>
          </div>
        </div>

        <button type="submit" disabled={saving}
          style={{ padding:"12px 28px", borderRadius:10, background:saving?"#d0ccc4":"#1a1814", color:saving?"#9a9690":"#fff", border:"none", fontSize:14, fontWeight:700, cursor:saving?"not-allowed":"pointer", alignSelf:"flex-start" }}>
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </form>
    </div>
  );
}