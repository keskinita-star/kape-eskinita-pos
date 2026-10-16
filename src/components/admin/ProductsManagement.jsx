import { useState, useEffect } from "react";
import { getProducts, addProduct, updateProduct, deleteProduct } from "../../services/productService";
import { getMaterials } from "../../services/materialService";
import { formatCurrency } from "../../utils/formatters";
import { LOW_STOCK_THRESHOLD } from "../../utils/constants";
import toast from "react-hot-toast";

const CATEGORIES = ["Espresso", "Cold Drinks", "Non-Coffee", "Food"];
const SIZE_PRESETS = ["Tall", "Grande", "Venti"];

const emptyMaterial = { materialId: "", qty: 1 };

const empty = {
  name: "", price: "", category: "Espresso", stock: "",
  description: "",
  materials: [{ ...emptyMaterial }],
  photoUrl: "",
  hasSizes: false,
  sizes: [{ label: "Tall", price: "" }],
};

const inputStyle = {
  width: "100%", padding: "9px 12px",
  border: "1px solid #e8e2d9", borderRadius: 8,
  fontSize: 13, background: "#fdfcfb", outline: "none",
  color: "#1a1814", fontFamily: "inherit",
  boxSizing: "border-box",
};
const labelStyle = {
  fontSize: 11, fontWeight: 600, color: "#9a9690",
  display: "block", marginBottom: 5,
  textTransform: "uppercase", letterSpacing: "0.5px",
};

// ─── Material row picker ──────────────────────────────────────────────────────

function MaterialRow({ row, allMaterials, onChange, onRemove, canRemove }) {
  const selected = allMaterials.find(m => m.id === row.materialId);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 32px", gap: 8, alignItems: "center" }}>
      <select
        style={inputStyle}
        value={row.materialId}
        onChange={e => onChange("materialId", e.target.value)}
      >
        <option value="">— Select material —</option>
        {allMaterials.map(m => (
          <option key={m.id} value={m.id}>
            {m.name} ({m.stock} {m.unit} left)
          </option>
        ))}
      </select>
      <div style={{ position: "relative" }}>
        <input
          style={inputStyle}
          type="number"
          min={0.01}
          step="0.01"
          value={row.qty}
          onChange={e => onChange("qty", Number(e.target.value))}
          placeholder="Qty"
        />
        {selected && (
          <span style={{
            position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
            fontSize: 10, color: "#9a9690", pointerEvents: "none",
          }}>
            {selected.unit}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={onRemove}
        disabled={!canRemove}
        style={{
          width: 32, height: 32, borderRadius: 8,
          border: "1px solid #fca5a5", background: "none",
          color: canRemove ? "#dc2626" : "#d0ccc4",
          fontSize: 16, cursor: canRemove ? "pointer" : "not-allowed",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >×</button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProductsManagement() {
  const [products, setProducts] = useState([]);
  const [allMaterials, setAllMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [photoPreview, setPhotoPreview] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [saving, setSaving] = useState(false);

  // Edit modal state
  const [editModal, setEditModal] = useState(false);
  const [editData, setEditData] = useState({ name: "", description: "", photoUrl: "", materials: [{ ...emptyMaterial }] });
  const [editId, setEditId] = useState(null);
  const [editPreview, setEditPreview] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const load = () => getProducts().then(p => { setProducts(p); setLoading(false); });
  const loadMaterials = () => getMaterials().then(setAllMaterials);

  useEffect(() => { load(); loadMaterials(); }, []);

  const filtered = activeCategory === "All" ? products : products.filter(p => p.category === activeCategory);

  // ── Form material helpers ─────────────────────────────────────────────────
  const addMaterialRow = () => setForm(f => ({ ...f, materials: [...f.materials, { ...emptyMaterial }] }));
  const removeMaterialRow = (i) => setForm(f => ({ ...f, materials: f.materials.filter((_, idx) => idx !== i) }));
  const updateMaterialRow = (i, field, value) => setForm(f => ({
    ...f, materials: f.materials.map((m, idx) => idx === i ? { ...m, [field]: value } : m),
  }));

  // ── Edit modal material helpers ───────────────────────────────────────────
  const addEditMaterialRow = () => setEditData(d => ({ ...d, materials: [...d.materials, { ...emptyMaterial }] }));
  const removeEditMaterialRow = (i) => setEditData(d => ({ ...d, materials: d.materials.filter((_, idx) => idx !== i) }));
  const updateEditMaterialRow = (i, field, value) => setEditData(d => ({
    ...d, materials: d.materials.map((m, idx) => idx === i ? { ...m, [field]: value } : m),
  }));

  // ── Size helpers ──────────────────────────────────────────────────────────
  const addSize = () => setForm(f => ({ ...f, sizes: [...f.sizes, { label: "", price: "" }] }));
  const removeSize = (i) => setForm(f => ({ ...f, sizes: f.sizes.filter((_, idx) => idx !== i) }));
  const updateSize = (i, field, value) => setForm(f => ({
    ...f, sizes: f.sizes.map((s, idx) => idx === i ? { ...s, [field]: value } : s),
  }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.hasSizes && form.sizes.some(s => !s.label || !s.price)) {
      toast.error("All sizes need a label and price.");
      return;
    }
    setSaving(true);
    const validMaterials = form.materials.filter(m => m.materialId && m.qty > 0);
    const data = {
      name: form.name,
      category: form.category,
      stock: Number(form.stock),
      description: form.description,
      materials: validMaterials,
      photoUrl: form.photoUrl,
      hasSizes: form.hasSizes,
      ...(form.hasSizes
        ? {
            sizes: form.sizes.map(s => ({ label: s.label, price: Number(s.price) })),
            price: Math.min(...form.sizes.map(s => Number(s.price))),
          }
        : {
            price: Number(form.price),
            sizes: [],
          }
      ),
    };
    try {
      await addProduct(data);
      toast.success("Product added!");
      setForm(empty); setEditing(null); setShowForm(false); setPhotoPreview("");
      load();
    } catch (err) {
      toast.error("Failed to save: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (p) => {
    setEditId(p.id);
    setEditData({
      name: p.name || "",
      description: p.description || "",
      photoUrl: p.photoUrl || "",
      materials: p.materials?.length ? p.materials : [{ ...emptyMaterial }],
    });
    setEditPreview(p.photoUrl || "");
    setEditModal(true);
  };

  const handleEditSave = async () => {
    if (!editData.name.trim()) {
      toast.error("Product name is required.");
      return;
    }
    setEditSaving(true);
    try {
      const existing = products.find(p => p.id === editId);
      const validMaterials = editData.materials.filter(m => m.materialId && m.qty > 0);
      await updateProduct(editId, {
        ...existing,
        name: editData.name,
        description: editData.description,
        photoUrl: editData.photoUrl,
        materials: validMaterials,
      });
      toast.success("Product updated!");
      setEditModal(false);
      load();
    } catch (err) {
      toast.error("Failed to update: " + err.message);
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this product?")) return;
    await deleteProduct(id);
    toast.success("Deleted.");
    load();
  };

  // ── Material label for product card ──────────────────────────────────────
  const getMaterialLabel = (mat) => {
    const found = allMaterials.find(m => m.id === mat.materialId);
    return found ? `${found.name} ×${mat.qty}` : null;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 900, margin: "0 auto" }}>

      {/* ── Edit Modal ──────────────────────────────────────────────────────── */}
      {editModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setEditModal(false); }}
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 16,
          }}>
          <div style={{
            background: "#fff", borderRadius: 16, width: "100%", maxWidth: 480,
            boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden",
            animation: "slideUp 0.2s ease", maxHeight: "90vh", overflowY: "auto",
          }}>
            {/* Header */}
            <div style={{
              padding: "18px 24px", borderBottom: "1px solid #f0ede8",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              background: "#fdfcfb",
            }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1814" }}>Edit Product</div>
              <button onClick={() => setEditModal(false)}
                style={{ width: 30, height: 30, borderRadius: "50%", border: "1px solid #e8e2d9", background: "#f5f3ee", cursor: "pointer", fontSize: 16, color: "#6b6860", display: "flex", alignItems: "center", justifyContent: "center" }}>
                ×
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>

              {/* Photo */}
              <div>
                <label style={labelStyle}>Photo URL</label>
                <input style={inputStyle} value={editData.photoUrl}
                  onChange={e => { setEditData(d => ({ ...d, photoUrl: e.target.value })); setEditPreview(e.target.value); }}
                  placeholder="https://res.cloudinary.com/..." />
                {editPreview ? (
                  <div style={{ marginTop: 10, width: "100%", height: 160, borderRadius: 10, border: "1px solid #e8e2d9", overflow: "hidden", background: "#f5f3ee" }}>
                    <img src={editPreview} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={() => setEditPreview("")} />
                  </div>
                ) : (
                  <div style={{ marginTop: 10, width: "100%", height: 100, borderRadius: 10, border: "1px dashed #e8e2d9", background: "#fdfcfb", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: 24 }}>🖼️</span>
                    <span style={{ fontSize: 11, color: "#b5b1aa" }}>Paste a URL above to preview</span>
                  </div>
                )}
              </div>

              {/* Name */}
              <div>
                <label style={labelStyle}>Product Name</label>
                <input style={inputStyle} value={editData.name}
                  onChange={e => setEditData(d => ({ ...d, name: e.target.value }))}
                  placeholder="e.g. Spanish Latte" required />
              </div>

              {/* Description */}
              <div>
                <label style={labelStyle}>Description</label>
                <textarea style={{ ...inputStyle, resize: "none", height: 80 }}
                  value={editData.description}
                  onChange={e => setEditData(d => ({ ...d, description: e.target.value }))}
                  placeholder="Short description of the product..." />
              </div>

              {/* Materials */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div>
                    <label style={labelStyle}>Materials used per order</label>
                    <div style={{ fontSize: 11, color: "#9a9690", marginTop: -3 }}>Stock will auto-deduct when ordered</div>
                  </div>
                  <button type="button" onClick={addEditMaterialRow}
                    style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid #e8e2d9", background: "#faf9f6", fontSize: 12, color: "#1a1814", cursor: "pointer", fontWeight: 500 }}>
                    + Add
                  </button>
                </div>
                {allMaterials.length === 0 ? (
                  <div style={{ fontSize: 12, color: "#b5b1aa", padding: "10px 0" }}>No materials found. Add some in Inventory first.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 32px", gap: 8 }}>
                      {["Material", "Qty / order", ""].map(h => (
                        <div key={h} style={{ fontSize: 10, fontWeight: 600, color: "#9a9690", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</div>
                      ))}
                    </div>
                    {editData.materials.map((row, i) => (
                      <MaterialRow
                        key={i}
                        row={row}
                        allMaterials={allMaterials}
                        onChange={(field, val) => updateEditMaterialRow(i, field, val)}
                        onRemove={() => removeEditMaterialRow(i)}
                        canRemove={editData.materials.length > 1}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: "14px 24px", borderTop: "1px solid #f0ede8", display: "flex", gap: 10, justifyContent: "flex-end", background: "#fdfcfb" }}>
              <button onClick={() => setEditModal(false)}
                style={{ padding: "9px 18px", borderRadius: 10, background: "none", border: "1px solid #e8e2d9", fontSize: 13, color: "#6b6860", cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={handleEditSave} disabled={editSaving}
                style={{ padding: "9px 22px", borderRadius: 10, background: editSaving ? "#d0ccc4" : "#1a1814", color: editSaving ? "#9a9690" : "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: editSaving ? "not-allowed" : "pointer" }}>
                {editSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1a1814", letterSpacing: "-0.5px" }}>Products</h2>
          <p style={{ fontSize: 13, color: "#9a9690", marginTop: 2 }}>{products.length} items on menu</p>
        </div>
        <button
          onClick={() => { setForm(empty); setEditing(null); setPhotoPreview(""); setShowForm(!showForm); }}
          style={{ padding: "9px 18px", borderRadius: 10, background: showForm ? "#f0ede8" : "#1a1814", color: showForm ? "#6b6860" : "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          {showForm ? "✕ Cancel" : "+ Add Product"}
        </button>
      </div>

      {/* ── Add Product Form ────────────────────────────────────────────────── */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: "#fff", border: "1px solid #e8e2d9", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "18px 24px", borderBottom: "1px solid #f0ede8", background: "#fdfcfb" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1814" }}>New Product</div>
          </div>

          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {/* Photo */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <label style={labelStyle}>Photo URL</label>
                  <input style={inputStyle} value={form.photoUrl}
                    onChange={e => { setForm(f => ({ ...f, photoUrl: e.target.value })); setPhotoPreview(e.target.value); }}
                    placeholder="https://example.com/coffee.jpg" />
                </div>
                <div style={{ width: "100%", aspectRatio: "4/3", borderRadius: 10, border: "1px solid #e8e2d9", overflow: "hidden", background: "#f5f3ee", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {photoPreview
                    ? <img src={photoPreview} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={() => setPhotoPreview("")} />
                    : <div style={{ textAlign: "center" }}><div style={{ fontSize: 32, marginBottom: 6 }}>🖼️</div><div style={{ fontSize: 11, color: "#9a9690" }}>Paste an image URL above to preview</div></div>
                  }
                </div>
                {photoPreview && (
                  <button type="button" onClick={() => { setPhotoPreview(""); setForm(f => ({ ...f, photoUrl: "" })); }}
                    style={{ padding: "5px", borderRadius: 6, border: "1px solid #fca5a5", background: "none", color: "#dc2626", fontSize: 11, cursor: "pointer" }}>
                    Remove photo
                  </button>
                )}
              </div>

              {/* Basic info */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={labelStyle}>Product name</label>
                  <input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Oat Milk Latte" required />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Stock</label>
                    <input style={inputStyle} type="number" min="0" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} placeholder="0" required />
                  </div>
                  <div>
                    <label style={labelStyle}>Category</label>
                    <select style={inputStyle} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Description</label>
                  <textarea style={{ ...inputStyle, resize: "none", height: 72 }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Short description..." />
                </div>

                {/* Sizes toggle */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 10, border: "1px solid #e8e2d9", background: "#fdfcfb" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1814" }}>Multiple sizes</div>
                    <div style={{ fontSize: 11, color: "#9a9690", marginTop: 1 }}>Tall, Grande, Venti pricing</div>
                  </div>
                  <button type="button" onClick={() => setForm(f => ({ ...f, hasSizes: !f.hasSizes }))}
                    style={{ width: 40, height: 22, borderRadius: 11, border: "none", background: form.hasSizes ? "#1a1814" : "#d0ccc4", cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
                    <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: form.hasSizes ? 21 : 3, transition: "left 0.2s" }} />
                  </button>
                </div>

                {!form.hasSizes && (
                  <div>
                    <label style={labelStyle}>Price (₱)</label>
                    <input style={inputStyle} type="number" min="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0.00" required={!form.hasSizes} />
                  </div>
                )}
              </div>
            </div>

            {/* Sizes */}
            {form.hasSizes && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <label style={labelStyle}>Sizes & Pricing</label>
                  <button type="button" onClick={addSize}
                    style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid #e8e2d9", background: "#faf9f6", fontSize: 12, color: "#1a1814", cursor: "pointer", fontWeight: 500 }}>
                    + Add size
                  </button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 32px", gap: 8 }}>
                    {["Size", "Price (₱)", ""].map(h => (
                      <div key={h} style={{ fontSize: 10, fontWeight: 600, color: "#9a9690", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</div>
                    ))}
                  </div>
                  {form.sizes.map((size, i) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 32px", gap: 8, alignItems: "center" }}>
                      <div style={{ display: "flex", gap: 4 }}>
                        {SIZE_PRESETS.map(p => (
                          <button key={p} type="button" onClick={() => updateSize(i, "label", p)}
                            style={{ padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, border: size.label === p ? "1.5px solid #1a1814" : "1px solid #e8e2d9", background: size.label === p ? "#1a1814" : "#fdfcfb", color: size.label === p ? "#fff" : "#6b6860", cursor: "pointer" }}>
                            {p}
                          </button>
                        ))}
                        <input style={{ ...inputStyle, flex: 1, minWidth: 0 }} value={size.label} onChange={e => updateSize(i, "label", e.target.value)} placeholder="Custom" />
                      </div>
                      <input style={inputStyle} type="number" min="0" value={size.price} onChange={e => updateSize(i, "price", e.target.value)} placeholder="0.00" />
                      <button type="button" onClick={() => removeSize(i)} disabled={form.sizes.length === 1}
                        style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #fca5a5", background: "none", color: form.sizes.length === 1 ? "#d0ccc4" : "#dc2626", fontSize: 16, cursor: form.sizes.length === 1 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Materials section ───────────────────────────────────────── */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div>
                  <label style={labelStyle}>Materials used per order</label>
                  <div style={{ fontSize: 11, color: "#9a9690", marginTop: -2 }}>Stock auto-deducts when this product is ordered</div>
                </div>
                <button type="button" onClick={addMaterialRow}
                  style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid #e8e2d9", background: "#faf9f6", fontSize: 12, color: "#1a1814", cursor: "pointer", fontWeight: 500 }}>
                  + Add material
                </button>
              </div>

              {allMaterials.length === 0 ? (
                <div style={{ fontSize: 12, color: "#b5b1aa", padding: "10px 0" }}>No materials found. Add some in Inventory first.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 32px", gap: 8 }}>
                    {["Material", "Qty / order", ""].map(h => (
                      <div key={h} style={{ fontSize: 10, fontWeight: 600, color: "#9a9690", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</div>
                    ))}
                  </div>
                  {form.materials.map((row, i) => (
                    <MaterialRow
                      key={i}
                      row={row}
                      allMaterials={allMaterials}
                      onChange={(field, val) => updateMaterialRow(i, field, val)}
                      onRemove={() => removeMaterialRow(i)}
                      canRemove={form.materials.length > 1}
                    />
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button type="submit" disabled={saving}
                style={{ padding: "10px 24px", borderRadius: 10, background: saving ? "#d0ccc4" : "#1a1814", color: saving ? "#9a9690" : "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
                {saving ? "Saving..." : "Add Product"}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                style={{ padding: "10px 18px", borderRadius: 10, background: "none", border: "1px solid #e8e2d9", fontSize: 13, color: "#6b6860", cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ── Category Filter ─────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {["All", ...CATEGORIES].map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)}
            style={{ padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 500, border: activeCategory === cat ? "1px solid #1a1814" : "1px solid #e8e2d9", background: activeCategory === cat ? "#1a1814" : "transparent", color: activeCategory === cat ? "#fff" : "#6b6860", cursor: "pointer" }}>
            {cat}
          </button>
        ))}
      </div>

      {/* ── Product Grid ────────────────────────────────────────────────────── */}
      {loading ? <p style={{ fontSize: 13, color: "#9a9690" }}>Loading...</p> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
          {filtered.map(p => (
            <div key={p.id} style={{ background: "#fff", border: "1px solid #e8e2d9", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ width: "100%", aspectRatio: "4/3", background: "#f5f3ee", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                {p.photoUrl
                  ? <img src={p.photoUrl} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <span style={{ fontSize: 40 }}>☕</span>}
              </div>
              <div style={{ padding: "12px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1814", lineHeight: 1.3 }}>{p.name}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1814", marginLeft: 8, whiteSpace: "nowrap" }}>
                    {p.hasSizes
                      ? `${formatCurrency(Math.min(...p.sizes.map(s => s.price)))}+`
                      : formatCurrency(p.price)}
                  </div>
                </div>
                {p.description && (
                  <div style={{ fontSize: 11, color: "#9a9690", marginBottom: 8, lineHeight: 1.4 }}>{p.description}</div>
                )}
                {p.hasSizes && p.sizes?.length > 0 && (
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
                    {p.sizes.map((s, i) => (
                      <span key={i} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: "#f5f3ee", color: "#6b6860", fontWeight: 500 }}>
                        {s.label} {formatCurrency(s.price)}
                      </span>
                    ))}
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#f5f3ee", color: "#6b6860" }}>{p.category}</span>
                  <span style={{ fontSize: 11, fontWeight: 500, color: p.stock <= 0 ? "#dc2626" : p.stock <= LOW_STOCK_THRESHOLD ? "#b45309" : "#166534" }}>
                    {p.stock <= 0 ? "Out of stock" : `${p.stock} in stock`}
                  </span>
                </div>

                {/* Materials badge on card */}
                {p.materials?.length > 0 && (
                  <div style={{ fontSize: 10, color: "#9a9690", marginBottom: 10, lineHeight: 1.7, borderTop: "1px solid #f0ede8", paddingTop: 8 }}>
                    {p.materials.map((mat, i) => {
                      const label = getMaterialLabel(mat);
                      return label ? <span key={i}>{label}{i < p.materials.length - 1 ? " · " : ""}</span> : null;
                    })}
                  </div>
                )}

                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => handleEdit(p)}
                    style={{ flex: 1, padding: "6px", borderRadius: 8, border: "1px solid #e8e2d9", background: "none", fontSize: 12, color: "#1a1814", cursor: "pointer", fontWeight: 500 }}>
                    Edit
                  </button>
                  <button onClick={() => handleDelete(p.id)}
                    style={{ flex: 1, padding: "6px", borderRadius: 8, border: "1px solid #fca5a5", background: "none", fontSize: 12, color: "#dc2626", cursor: "pointer", fontWeight: 500 }}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}