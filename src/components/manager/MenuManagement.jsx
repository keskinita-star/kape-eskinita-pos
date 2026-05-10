import { useState, useEffect } from "react";
import { getProducts, addProduct, updateProduct, deleteProduct } from "../../services/productService";
import { formatCurrency } from "../../utils/formatters";
import { LOW_STOCK_THRESHOLD, CATEGORIES } from "../../utils/constants";
import toast from "react-hot-toast";

const UNITS = ["g","kg","ml","L","pcs","tbsp","tsp","oz"];
const empty = { name:"", price:"", category:"Espresso", stock:"", description:"", ingredients:[{ name:"", quantity:"", unit:"g", cost:"" }], photoUrl:"" };

export default function MenuManagement() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  const [photoPreview, setPhotoPreview] = useState("");

  const load = () => getProducts().then(p => { setProducts(p); setLoading(false); });
  useEffect(() => { load(); }, []);

  const filtered = activeCategory === "All" ? products : products.filter(p => p.category === activeCategory);

  const addIngredient = () => setForm(f => ({ ...f, ingredients:[...f.ingredients,{ name:"", quantity:"", unit:"g", cost:"" }] }));
  const removeIngredient = (i) => setForm(f => ({ ...f, ingredients:f.ingredients.filter((_,idx) => idx!==i) }));
  const updateIngredient = (i, field, value) => setForm(f => ({ ...f, ingredients:f.ingredients.map((ing,idx) => idx===i ? { ...ing,[field]:value } : ing) }));
  const totalCost = form.ingredients.reduce((s,i) => s+(Number(i.cost)||0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    const data = { name:form.name, price:Number(form.price), category:form.category, stock:Number(form.stock), description:form.description, ingredients:form.ingredients.filter(i=>i.name), photoUrl:form.photoUrl };
    try {
      if (editing) { await updateProduct(editing, data); toast.success("Product updated!"); }
      else { await addProduct(data); toast.success("Product added!"); }
      setForm(empty); setEditing(null); setShowForm(false); setPhotoPreview(""); load();
    } catch (err) { toast.error("Failed: "+err.message); }
    finally { setSaving(false); }
  };

  const handleEdit = (p) => {
    setForm({ name:p.name, price:p.price, category:p.category, stock:p.stock, description:p.description||"", ingredients:p.ingredients?.length ? p.ingredients : [{ name:"", quantity:"", unit:"g", cost:"" }], photoUrl:p.photoUrl||"" });
    setPhotoPreview(p.photoUrl||""); setEditing(p.id); setShowForm(true);
    window.scrollTo({ top:0, behavior:"smooth" });
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this product?")) return;
    await deleteProduct(id); toast.success("Deleted."); load();
  };

  const inp = { width:"100%", padding:"9px 12px", border:"1px solid #e8e2d9", borderRadius:8, fontSize:13, background:"#fdfcfb", outline:"none", color:"#1a1814", fontFamily:"inherit" };
  const lbl = { fontSize:11, fontWeight:600, color:"#9a9690", display:"block", marginBottom:5, textTransform:"uppercase", letterSpacing:"0.5px" };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <h2 style={{ fontSize:20, fontWeight:700, color:"#1a1814", letterSpacing:"-0.5px" }}>Menu Management</h2>
          <p style={{ fontSize:13, color:"#9a9690", marginTop:2 }}>{products.length} items</p>
        </div>
        <button onClick={() => { setForm(empty); setEditing(null); setPhotoPreview(""); setShowForm(!showForm); }}
          style={{ padding:"9px 18px", borderRadius:10, background:showForm?"#f0ede8":"#1a1814", color:showForm?"#6b6860":"#fff", border:"none", fontSize:13, fontWeight:600, cursor:"pointer" }}>
          {showForm ? "✕ Cancel" : "+ Add Item"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ background:"#fff", border:"1px solid #e8e2d9", borderRadius:16, overflow:"hidden" }}>
          <div style={{ padding:"16px 24px", borderBottom:"1px solid #f0ede8", background:"#fdfcfb" }}>
            <div style={{ fontSize:15, fontWeight:700, color:"#1a1814" }}>{editing ? "Edit Item" : "New Menu Item"}</div>
          </div>
          <div style={{ padding:24, display:"flex", flexDirection:"column", gap:20 }}>
            {/* Photo + Basic */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                <div>
                  <label style={lbl}>Product Name</label>
                  <input style={inp} value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Oat Milk Latte" required />
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  <div>
                    <label style={lbl}>Price (₱)</label>
                    <input style={inp} type="number" min="0" value={form.price} onChange={e => setForm(f=>({...f,price:e.target.value}))} placeholder="0.00" required />
                  </div>
                  <div>
                    <label style={lbl}>Stock</label>
                    <input style={inp} type="number" min="0" value={form.stock} onChange={e => setForm(f=>({...f,stock:e.target.value}))} placeholder="0" required />
                  </div>
                </div>
                <div>
                  <label style={lbl}>Category</label>
                  <select style={inp} value={form.category} onChange={e => setForm(f=>({...f,category:e.target.value}))}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Description</label>
                  <textarea style={{ ...inp, resize:"none", height:60 }} value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))} placeholder="Short description..." />
                </div>
              </div>
              <div>
                <label style={lbl}>Photo URL</label>
                <input style={inp} value={form.photoUrl} onChange={e => { setForm(f=>({...f,photoUrl:e.target.value})); setPhotoPreview(e.target.value); }} placeholder="https://example.com/coffee.jpg" />
                <div style={{ marginTop:10, width:"100%", aspectRatio:"4/3", borderRadius:10, border:"1px solid #e8e2d9", overflow:"hidden", background:"#f5f3ee", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  {photoPreview
                    ? <img src={photoPreview} alt="preview" style={{ width:"100%", height:"100%", objectFit:"cover" }} onError={() => setPhotoPreview("")} />
                    : <div style={{ textAlign:"center" }}><div style={{ fontSize:32 }}>🖼️</div><div style={{ fontSize:11, color:"#9a9690", marginTop:4 }}>Paste URL to preview</div></div>
                  }
                </div>
                <div style={{ fontSize:11, color:"#9a9690", marginTop:6 }}>Use imgbb.com or postimages.org for free hosting</div>
              </div>
            </div>

            {/* Ingredients */}
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                <div>
                  <label style={lbl}>Ingredients & Cost Tracking</label>
                  {totalCost > 0 && <span style={{ fontSize:12, color:"#6b6860" }}>Total cost: <strong>{formatCurrency(totalCost)}</strong></span>}
                </div>
                <button type="button" onClick={addIngredient} style={{ padding:"5px 12px", borderRadius:8, border:"1px solid #e8e2d9", background:"#faf9f6", fontSize:12, color:"#1a1814", cursor:"pointer", fontWeight:500 }}>+ Add</button>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 80px 80px 90px 32px", gap:8, marginBottom:6 }}>
                {["Ingredient","Qty","Unit","Cost (₱)",""].map(h => <div key={h} style={{ fontSize:10, fontWeight:600, color:"#9a9690", textTransform:"uppercase", letterSpacing:"0.5px" }}>{h}</div>)}
              </div>
              {form.ingredients.map((ing, i) => (
                <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 80px 80px 90px 32px", gap:8, marginBottom:6, alignItems:"center" }}>
                  <input style={inp} value={ing.name} onChange={e => updateIngredient(i,"name",e.target.value)} placeholder="e.g. Espresso" />
                  <input style={inp} type="number" min="0" value={ing.quantity} onChange={e => updateIngredient(i,"quantity",e.target.value)} placeholder="0" />
                  <select style={inp} value={ing.unit} onChange={e => updateIngredient(i,"unit",e.target.value)}>
                    {UNITS.map(u => <option key={u}>{u}</option>)}
                  </select>
                  <input style={inp} type="number" min="0" value={ing.cost} onChange={e => updateIngredient(i,"cost",e.target.value)} placeholder="0.00" />
                  <button type="button" onClick={() => removeIngredient(i)} style={{ width:32, height:32, borderRadius:8, border:"1px solid #fca5a5", background:"none", color:"#dc2626", fontSize:16, cursor:"pointer" }}>×</button>
                </div>
              ))}
              {totalCost > 0 && form.price && (
                <div style={{ marginTop:10, padding:"10px 14px", background:"#f5f3ee", borderRadius:10, display:"flex", gap:20, fontSize:12, flexWrap:"wrap" }}>
                  <span style={{ color:"#6b6860" }}>Cost: <strong style={{ color:"#1a1814" }}>{formatCurrency(totalCost)}</strong></span>
                  <span style={{ color:"#6b6860" }}>Price: <strong style={{ color:"#1a1814" }}>{formatCurrency(Number(form.price))}</strong></span>
                  <span style={{ color:"#6b6860" }}>Margin: <strong style={{ color: Number(form.price)-totalCost > 0 ? "#166534" : "#dc2626" }}>
                    {formatCurrency(Number(form.price)-totalCost)} ({Number(form.price)>0 ? Math.round(((Number(form.price)-totalCost)/Number(form.price))*100) : 0}%)
                  </strong></span>
                </div>
              )}
            </div>

            <div style={{ display:"flex", gap:10 }}>
              <button type="submit" disabled={saving} style={{ padding:"10px 24px", borderRadius:10, background:saving?"#d0ccc4":"#1a1814", color:saving?"#9a9690":"#fff", border:"none", fontSize:13, fontWeight:600, cursor:saving?"not-allowed":"pointer" }}>
                {saving ? "Saving..." : editing ? "Save Changes" : "Add Item"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} style={{ padding:"10px 18px", borderRadius:10, background:"none", border:"1px solid #e8e2d9", fontSize:13, color:"#6b6860", cursor:"pointer" }}>Cancel</button>
            </div>
          </div>
        </form>
      )}

      {/* Category Filter */}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
        {["All",...CATEGORIES].map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)}
            style={{ padding:"5px 14px", borderRadius:20, fontSize:12, fontWeight:500, border: activeCategory===cat ? "1px solid #1a1814" : "1px solid #e8e2d9", background: activeCategory===cat ? "#1a1814" : "transparent", color: activeCategory===cat ? "#fff" : "#6b6860", cursor:"pointer" }}>
            {cat}
          </button>
        ))}
      </div>

      {/* Product Grid */}
      {loading ? <p style={{ fontSize:13, color:"#9a9690" }}>Loading...</p> : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:14 }}>
          {filtered.map(p => (
            <div key={p.id} style={{ background:"#fff", border:"1px solid #e8e2d9", borderRadius:14, overflow:"hidden" }}>
              <div style={{ width:"100%", aspectRatio:"4/3", background:"#f5f3ee", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
                {p.photoUrl ? <img src={p.photoUrl} alt={p.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : <span style={{ fontSize:36 }}>☕</span>}
              </div>
              <div style={{ padding:"12px 14px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:"#1a1814" }}>{p.name}</div>
                  <div style={{ fontSize:13, fontWeight:700, color:"#1a1814", marginLeft:8, whiteSpace:"nowrap" }}>{formatCurrency(p.price)}</div>
                </div>
                {p.description && <div style={{ fontSize:11, color:"#9a9690", marginBottom:6, lineHeight:1.4 }}>{p.description}</div>}
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                  <span style={{ fontSize:11, padding:"2px 8px", borderRadius:20, background:"#f5f3ee", color:"#6b6860" }}>{p.category}</span>
                  <span style={{ fontSize:11, fontWeight:500, color: p.stock<=0?"#dc2626":p.stock<=LOW_STOCK_THRESHOLD?"#b45309":"#166534" }}>
                    {p.stock<=0 ? "Out of stock" : `${p.stock} in stock`}
                  </span>
                </div>
                {p.ingredients?.length > 0 && (
                  <div style={{ fontSize:10, color:"#9a9690", borderTop:"1px solid #f0ede8", paddingTop:6, marginBottom:8, lineHeight:1.6 }}>
                    {p.ingredients.map((ing,i) => <span key={i}>{ing.name}{i<p.ingredients.length-1?" · ":""}</span>)}
                  </div>
                )}
                <div style={{ display:"flex", gap:6 }}>
                  <button onClick={() => handleEdit(p)} style={{ flex:1, padding:"6px", borderRadius:8, border:"1px solid #e8e2d9", background:"none", fontSize:12, color:"#1a1814", cursor:"pointer", fontWeight:500 }}>Edit</button>
                  <button onClick={() => handleDelete(p.id)} style={{ flex:1, padding:"6px", borderRadius:8, border:"1px solid #fca5a5", background:"none", fontSize:12, color:"#dc2626", cursor:"pointer", fontWeight:500 }}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}