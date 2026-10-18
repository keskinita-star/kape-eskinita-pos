import { useState, useEffect } from "react";
import { getMaterials, addMaterial, updateMaterial, deleteMaterial } from "../../services/materialService";
import { formatCurrency } from "../../utils/formatters";
import toast from "react-hot-toast";

const UNITS = ["pcs", "boxes", "packs", "rolls", "sleeves", "bags", "sets", "pairs"];
const CATEGORIES = ["Cups & Lids", "Straws & Stirrers", "Packaging", "Napkins & Tissue", "Cleaning Supplies", "Other"];

const empty = { name: "", category: "Cups & Lids", unit: "pcs", stock: "", minStock: "", costPerUnit: "", supplier: "" };

const inp = {
  width: "100%", padding: "9px 12px", border: "1px solid #e8e2d9",
  borderRadius: 8, fontSize: 13, background: "#fdfcfb", outline: "none",
  color: "#1a1814", fontFamily: "inherit", boxSizing: "border-box",
};
const lbl = {
  fontSize: 11, fontWeight: 600, color: "#9a9690", display: "block",
  marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.5px",
};

const stockStatus = (item) => {
  if (Number(item.stock) <= 0)
    return { label: "Out of stock", color: "#dc2626", bg: "#fef2f2" };
  if (Number(item.stock) <= Number(item.minStock))
    return { label: `Low: ${item.stock} ${item.unit}`, color: "#b45309", bg: "#fff7ed" };
  return { label: `${item.stock} ${item.unit}`, color: "#166534", bg: "#f0fdf4" };
};

export default function InventoryManagement() {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("All");
  const [restockId, setRestockId] = useState(null);
  const [restockQty, setRestockQty] = useState("");

  const load = () =>
    getMaterials()
      .then(m => { setMaterials(m); })
      .catch(err => {
        console.error(err);
        toast.error("Couldn't load materials: " + err.message);
      })
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const lowItems = materials.filter(m => Number(m.stock) > 0 && Number(m.stock) <= Number(m.minStock));
  const outItems = materials.filter(m => Number(m.stock) <= 0);

  const filtered = materials.filter(m => {
    if (filter === "Low Stock") return Number(m.stock) > 0 && Number(m.stock) <= Number(m.minStock);
    if (filter === "Out of Stock") return Number(m.stock) <= 0;
    if (filter === "All") return true;
    return m.category === filter;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = {
      name: form.name,
      category: form.category,
      unit: form.unit,
      stock: Number(form.stock),
      minStock: Number(form.minStock),
      supplier: form.supplier,
      // cost is optional
      ...(form.costPerUnit !== "" && form.costPerUnit != null ? { costPerUnit: Number(form.costPerUnit) } : {}),
    };
    try {
      if (editing) {
        await updateMaterial(editing, data);
        toast.success("Material updated!");
      } else {
        await addMaterial(data);
        toast.success("Material added!");
      }
      setForm(empty); setEditing(null); setShowForm(false); load();
    } catch (err) {
      toast.error("Failed: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    setForm({
      name: item.name, category: item.category, unit: item.unit,
      stock: item.stock, minStock: item.minStock,
      costPerUnit: item.costPerUnit ?? "", supplier: item.supplier || "",
    });
    setEditing(item.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this material?")) return;
    await deleteMaterial(id);
    toast.success("Deleted.");
    load();
  };

  const handleRestock = async (id) => {
    if (!restockQty || Number(restockQty) <= 0) return toast.error("Enter a valid quantity.");
    const item = materials.find(m => m.id === id);
    await updateMaterial(id, { ...item, stock: Number(item.stock) + Number(restockQty) });
    toast.success(`Restocked +${restockQty} ${item.unit}`);
    setRestockId(null); setRestockQty(""); load();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1a1814", letterSpacing: "-0.5px", margin: 0 }}>Inventory</h2>
          <p style={{ fontSize: 13, color: "#9a9690", marginTop: 2 }}>{materials.length} materials tracked</p>
        </div>
        <button
          onClick={() => { setForm(empty); setEditing(null); setShowForm(!showForm); }}
          style={{ padding: "9px 18px", borderRadius: 10, background: showForm ? "#f0ede8" : "#1a1814", color: showForm ? "#6b6860" : "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
          {showForm ? "✕ Cancel" : "+ Add Material"}
        </button>
      </div>

      {/* Alerts */}
      {(lowItems.length > 0 || outItems.length > 0) && (
        <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 12, padding: "14px 18px" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#b45309", marginBottom: 10 }}>⚠️ Stock Alerts</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {outItems.map(m => (
              <div key={m.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "#1a1814", fontWeight: 500 }}>{m.name}</span>
                <span style={{ color: "#dc2626", fontWeight: 600 }}>Out of stock</span>
              </div>
            ))}
            {lowItems.map(m => (
              <div key={m.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "#1a1814", fontWeight: 500 }}>{m.name}</span>
                <span style={{ color: "#b45309", fontWeight: 600 }}>Only {m.stock} {m.unit} left (min: {m.minStock})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add / Edit Form */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: "#fff", border: "1px solid #e8e2d9", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "16px 24px", borderBottom: "1px solid #f0ede8", background: "#fdfcfb" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1814" }}>{editing ? "Edit Material" : "New Material"}</div>
          </div>
          <div style={{ padding: 24, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>

            <div style={{ gridColumn: "1/-1" }}>
              <label style={lbl}>Material Name</label>
              <input style={inp} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Paper Cups" required />
            </div>

            <div>
              <label style={lbl}>Category</label>
              <select style={inp} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label style={lbl}>Unit</label>
              <select style={inp} value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                {UNITS.map(u => <option key={u}>{u}</option>)}
              </select>
            </div>

            <div>
              <label style={lbl}>Supplier</label>
              <input style={inp} value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} placeholder="e.g. SM Stationery" />
            </div>

            <div>
              <label style={lbl}>Current Stock</label>
              <input type="number" min="0" style={inp} value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} placeholder="0" required />
            </div>

            <div>
              <label style={lbl}>Min Stock (alert threshold)</label>
              <input type="number" min="0" style={inp} value={form.minStock} onChange={e => setForm(f => ({ ...f, minStock: e.target.value }))} placeholder="0" required />
            </div>

            <div>
              <label style={lbl}>Cost per Unit (₱) — optional</label>
              <input type="number" min="0" step="0.01" style={inp} value={form.costPerUnit} onChange={e => setForm(f => ({ ...f, costPerUnit: e.target.value }))} placeholder="0.00" />
            </div>

            <div style={{ gridColumn: "1/-1", display: "flex", gap: 10 }}>
              <button type="submit" disabled={saving}
                style={{ padding: "10px 24px", borderRadius: 10, background: saving ? "#d0ccc4" : "#1a1814", color: saving ? "#9a9690" : "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                {saving ? "Saving..." : editing ? "Save Changes" : "Add Material"}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditing(null); }}
                style={{ padding: "10px 18px", borderRadius: 10, background: "none", border: "1px solid #e8e2d9", fontSize: 13, color: "#6b6860", cursor: "pointer", fontFamily: "inherit" }}>
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {["All", "Low Stock", "Out of Stock", ...CATEGORIES].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 500, border: filter === f ? "1px solid #1a1814" : "1px solid #e8e2d9", background: filter === f ? "#1a1814" : "transparent", color: filter === f ? "#fff" : "#6b6860", cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit" }}>
            {f}
            {f === "Low Stock" && lowItems.length > 0 && (
              <span style={{ marginLeft: 5, background: "#b45309", color: "#fff", borderRadius: 10, padding: "1px 6px", fontSize: 10 }}>{lowItems.length}</span>
            )}
            {f === "Out of Stock" && outItems.length > 0 && (
              <span style={{ marginLeft: 5, background: "#dc2626", color: "#fff", borderRadius: 10, padding: "1px 6px", fontSize: 10 }}>{outItems.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <p style={{ fontSize: 13, color: "#9a9690" }}>Loading...</p>
      ) : filtered.length === 0 ? (
        <div style={{ background: "#fff", border: "1px solid #e8e2d9", borderRadius: 12, padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>
          <p style={{ fontSize: 13, color: "#9a9690" }}>No materials found. Add your first material above.</p>
        </div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid #e8e2d9", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f5f3ee" }}>
                {["Material", "Category", "Stock", "Min Stock", "Cost/Unit", "Supplier", "Actions"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#9a9690", borderBottom: "1px solid #e8e2d9", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const status = stockStatus(item);
                return (
                  <tr key={item.id} style={{ borderBottom: "1px solid #f5f3ee" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#fdfcfb"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>

                    <td style={{ padding: "12px 14px", fontWeight: 600, color: "#1a1814" }}>{item.name}</td>

                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#f5f3ee", color: "#6b6860" }}>{item.category}</span>
                    </td>

                    <td style={{ padding: "12px 14px" }}>
                      {restockId === item.id ? (
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <input
                            type="number" min="1" value={restockQty}
                            onChange={e => setRestockQty(e.target.value)}
                            placeholder="+qty" autoFocus
                            style={{ width: 70, padding: "5px 8px", border: "1px solid #e8e2d9", borderRadius: 6, fontSize: 12, fontFamily: "inherit" }}
                          />
                          <button onClick={() => handleRestock(item.id)}
                            style={{ padding: "4px 8px", borderRadius: 6, background: "#166534", color: "#fff", border: "none", fontSize: 11, cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>
                            +Add
                          </button>
                          <button onClick={() => { setRestockId(null); setRestockQty(""); }}
                            style={{ padding: "4px 6px", borderRadius: 6, background: "none", border: "1px solid #e8e2d9", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                            ✕
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 20, fontWeight: 500, background: status.bg, color: status.color }}>{status.label}</span>
                      )}
                    </td>

                    <td style={{ padding: "12px 14px", color: "#9a9690", fontSize: 12 }}>{item.minStock} {item.unit}</td>

                    <td style={{ padding: "12px 14px", color: "#1a1814", fontWeight: 500 }}>
                      {item.costPerUnit != null && item.costPerUnit !== "" ? `${formatCurrency(item.costPerUnit)}/${item.unit}` : "—"}
                    </td>

                    <td style={{ padding: "12px 14px", color: "#6b6860" }}>{item.supplier || "—"}</td>

                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => { setRestockId(item.id); setRestockQty(""); }}
                          style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #bbf7d0", background: "#f0fdf4", fontSize: 11, color: "#166634", cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>
                          Restock
                        </button>
                        <button onClick={() => handleEdit(item)}
                          style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #e8e2d9", background: "none", fontSize: 11, color: "#1a1814", cursor: "pointer", fontFamily: "inherit" }}>
                          Edit
                        </button>
                        <button onClick={() => handleDelete(item.id)}
                          style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #fca5a5", background: "none", fontSize: 11, color: "#dc2626", cursor: "pointer", fontFamily: "inherit" }}>
                          Delete
                        </button>
                      </div>
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