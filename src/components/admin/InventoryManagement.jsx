import { useEffect, useState } from "react";
import {
  getIngredients,
  addIngredient,
  updateIngredient,
  deleteIngredient,
} from "../../services/ingredientService";
import { formatCurrency } from "../../utils/formatters";
import toast from "react-hot-toast";

const UNITS = ["g", "kg", "ml", "L", "pcs", "tbsp", "tsp", "cups"];

const empty = { name: "", stock: 0, unit: "g", costPerUnit: 0, lowStockThreshold: 0 };

// ─── Shared styles ────────────────────────────────────────────────────────────

const inp = {
  width: "100%", padding: "9px 12px", border: "1px solid #e8e2d9",
  borderRadius: 8, fontSize: 13, background: "#fdfcfb", outline: "none",
  color: "#1a1814", fontFamily: "inherit", boxSizing: "border-box",
};
const lbl = {
  fontSize: 11, fontWeight: 600, color: "#9a9690", display: "block",
  marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.5px",
};

// ─── Stock bar ────────────────────────────────────────────────────────────────

function StockBar({ stock, threshold }) {
  const max = Math.max(stock, threshold * 3, 1);
  const pct = Math.min(100, (stock / max) * 100);
  const isLow = stock <= threshold;
  const isCritical = stock === 0;
  const color = isCritical ? "#dc2626" : isLow ? "#b45309" : "#16a34a";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: "#f0ede8", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: 6, width: `${pct}%`, background: color, borderRadius: 3, transition: "width 0.3s ease" }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color, minWidth: 28, textAlign: "right" }}>{stock}</span>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{ background: "#fff", border: "0.5px solid #e0ddd5", borderRadius: 12, padding: "16px 20px" }}>
      <div style={{ fontSize: 12, color: "#9a9690", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: accent || "#1a1814", letterSpacing: "-0.5px" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#9a9690", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function IngredientModal({ initial, onClose, onSave }) {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (initial) setForm({ ...empty, ...initial }); }, [initial]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Name is required.");
    setSaving(true);
    try { await onSave(form); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(26,24,20,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 420, boxShadow: "0 20px 60px #0000001a", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "18px 24px", borderBottom: "0.5px solid #e0ddd5", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1814" }}>{initial ? "Edit Ingredient" : "Add Ingredient"}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, color: "#9a9690", cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={lbl}>Ingredient name</label>
            <input style={inp} placeholder="e.g. Coffee Beans" value={form.name} onChange={e => set("name", e.target.value)} required />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={lbl}>Current stock</label>
              <input type="number" min={0} style={inp} value={form.stock} onChange={e => set("stock", Number(e.target.value))} />
            </div>
            <div>
              <label style={lbl}>Unit</label>
              <select style={inp} value={form.unit} onChange={e => set("unit", e.target.value)}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={lbl}>Cost per unit (₱)</label>
              <input type="number" min={0} step="0.01" style={inp} value={form.costPerUnit} onChange={e => set("costPerUnit", Number(e.target.value))} />
            </div>
            <div>
              <label style={lbl}>Low stock alert at</label>
              <input type="number" min={0} style={inp} value={form.lowStockThreshold} onChange={e => set("lowStockThreshold", Number(e.target.value))} />
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button type="submit" disabled={saving}
              style={{ flex: 1, padding: "11px", borderRadius: 10, background: saving ? "#d0ccc4" : "#1a1814", color: saving ? "#9a9690" : "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
              {saving ? "Saving…" : initial ? "Save changes" : "Add ingredient"}
            </button>
            <button type="button" onClick={onClose}
              style={{ padding: "11px 18px", borderRadius: 10, background: "none", border: "0.5px solid #e0ddd5", fontSize: 13, color: "#6b6860", cursor: "pointer", fontFamily: "inherit" }}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function InventoryManagement() {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // "all" | "low" | "ok"

  const load = () => getIngredients().then(data => { setIngredients(data); setLoading(false); });
  useEffect(() => { load(); }, []);

  const lowStock = ingredients.filter(i => i.stock <= (i.lowStockThreshold || 0));
  const totalValue = ingredients.reduce((s, i) => s + i.stock * (i.costPerUnit || 0), 0);

  const displayed = ingredients
    .filter(i => i.name?.toLowerCase().includes(search.toLowerCase()))
    .filter(i => {
      if (filter === "low") return i.stock <= (i.lowStockThreshold || 0);
      if (filter === "ok")  return i.stock > (i.lowStockThreshold || 0);
      return true;
    });

  const handleSave = async (data) => {
    try {
      if (editing) {
        await updateIngredient(editing.id, data);
        toast.success("Ingredient updated.");
      } else {
        await addIngredient(data);
        toast.success("Ingredient added.");
      }
      setShowForm(false);
      setEditing(null);
      load();
    } catch {
      toast.error("Failed to save.");
    }
  };

  const handleDelete = async (i) => {
    if (!confirm(`Delete "${i.name}"?`)) return;
    try {
      await deleteIngredient(i.id);
      toast.success("Deleted.");
      load();
    } catch {
      toast.error("Failed to delete.");
    }
  };

  const openEdit = (i) => { setEditing(i); setShowForm(true); };
  const openAdd  = () => { setEditing(null); setShowForm(true); };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1a1814", letterSpacing: "-0.5px", margin: 0 }}>Inventory</h2>
          <p style={{ fontSize: 13, color: "#9a9690", marginTop: 3 }}>{ingredients.length} ingredients tracked</p>
        </div>
        <button onClick={openAdd}
          style={{ padding: "9px 18px", borderRadius: 10, background: "#1a1814", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
          + Add Ingredient
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: 12 }}>
        <StatCard label="Total Value" value={formatCurrency(totalValue)} sub="based on current stock" />
        <StatCard label="Ingredients" value={ingredients.length} sub="items tracked" />
        <StatCard label="Low Stock" value={lowStock.length} sub={lowStock.length ? lowStock.slice(0,2).map(i=>i.name).join(", ") : "All good"} accent={lowStock.length ? "#dc2626" : "#16a34a"} />
      </div>

      {/* Low stock alert banner */}
      {lowStock.length > 0 && (
        <div style={{ background: "#fff7ed", border: "0.5px solid #fed7aa", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#9a3412" }}>Low stock alert</div>
            <div style={{ fontSize: 12, color: "#c2410c", marginTop: 1 }}>{lowStock.map(i => i.name).join(" · ")}</div>
          </div>
        </div>
      )}

      {/* Search + filter */}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{ flex: 1, position: "relative" }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#9a9690" }}>🔍</span>
          <input
            placeholder="Search ingredients…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...inp, paddingLeft: 34 }}
          />
        </div>
        {["all", "low", "ok"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: "8px 14px", borderRadius: 20, fontSize: 12, fontWeight: 500, border: `0.5px solid ${filter === f ? "#1a1814" : "#e0ddd5"}`, background: filter === f ? "#1a1814" : "transparent", color: filter === f ? "#fff" : "#6b6860", cursor: "pointer", fontFamily: "inherit" }}>
            {f === "all" ? "All" : f === "low" ? "⚠ Low" : "✓ OK"}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: "#fff", border: "0.5px solid #e0ddd5", borderRadius: 12, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", fontSize: 13, color: "#9a9690" }}>Loading…</div>
        ) : displayed.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", fontSize: 13, color: "#9a9690" }}>No ingredients found.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f5f3ee" }}>
                {["Ingredient", "Stock level", "Unit", "Cost / unit", "Total value", ""].map(h => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#9a9690", borderBottom: "0.5px solid #e0ddd5", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.map((i, idx) => {
                const isLow      = i.stock <= (i.lowStockThreshold || 0);
                const isCritical = i.stock === 0;
                return (
                  <tr key={i.id} style={{ borderBottom: idx < displayed.length - 1 ? "0.5px solid #f0ede8" : "none", transition: "background 0.1s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#fdfcfb"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>

                    {/* Name */}
                    <td style={{ padding: "13px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: isCritical ? "#dc2626" : isLow ? "#f59e0b" : "#16a34a", flexShrink: 0 }} />
                        <span style={{ fontWeight: 600, color: "#1a1814" }}>{i.name}</span>
                      </div>
                    </td>

                    {/* Stock bar */}
                    <td style={{ padding: "13px 16px", minWidth: 140 }}>
                      <StockBar stock={i.stock} threshold={i.lowStockThreshold || 0} />
                      {isLow && (
                        <div style={{ fontSize: 10, color: isCritical ? "#dc2626" : "#b45309", marginTop: 3, fontWeight: 600 }}>
                          {isCritical ? "Out of stock" : `Low — reorder below ${i.lowStockThreshold} ${i.unit}`}
                        </div>
                      )}
                    </td>

                    {/* Unit */}
                    <td style={{ padding: "13px 16px", color: "#6b6860" }}>{i.unit}</td>

                    {/* Cost per unit */}
                    <td style={{ padding: "13px 16px", color: "#6b6860" }}>{formatCurrency(i.costPerUnit)}</td>

                    {/* Total value */}
                    <td style={{ padding: "13px 16px", fontWeight: 600, color: "#1a1814" }}>
                      {formatCurrency(i.stock * (i.costPerUnit || 0))}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: "13px 16px" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <button onClick={() => openEdit(i)}
                          style={{ padding: "5px 12px", borderRadius: 6, border: "0.5px solid #e0ddd5", background: "none", fontSize: 12, color: "#1a1814", cursor: "pointer", fontWeight: 500, fontFamily: "inherit" }}>
                          Edit
                        </button>
                        <button onClick={() => handleDelete(i)}
                          style={{ padding: "5px 12px", borderRadius: 6, border: "0.5px solid #fca5a5", background: "none", fontSize: 12, color: "#dc2626", cursor: "pointer", fontWeight: 500, fontFamily: "inherit" }}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <IngredientModal
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}