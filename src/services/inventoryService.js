import { useState, useEffect } from "react";
import { getIngredients, addIngredient, updateIngredient, deleteIngredient } from "./ingredientService";
import { formatCurrency } from "../utils/formatters";
import toast from "react-hot-toast";

const UNITS = ["g","kg","ml","L","pcs","tbsp","tsp","oz","bags","boxes"];
const CATEGORIES = ["Coffee Beans","Milk & Cream","Syrups & Sauces","Powder & Mix","Packaging","Food Ingredients","Other"];
const empty = { name:"", category:"Coffee Beans", unit:"g", stock:"", minStock:"", costPerUnit:"", supplier:"" };

export default function Inventory() {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("All");
  const [restockId, setRestockId] = useState(null);
  const [restockQty, setRestockQty] = useState("");

  const load = () => getIngredients().then(i => { setIngredients(i); setLoading(false); });
  useEffect(() => { load(); }, []);

  const lowItems = ingredients.filter(i => Number(i.stock) <= Number(i.minStock) && Number(i.stock) > 0);
  const outItems = ingredients.filter(i => Number(i.stock) <= 0);

  const filtered = ingredients.filter(i => {
    if (filter === "Low Stock") return Number(i.stock) > 0 && Number(i.stock) <= Number(i.minStock);
    if (filter === "Out of Stock") return Number(i.stock) <= 0;
    if (filter === "All") return true;
    return i.category === filter;
  });

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    const data = {
      name: form.name,
      category: form.category,
      unit: form.unit,
      stock: Number(form.stock),
      minStock: Number(form.minStock),
      costPerUnit: Number(form.costPerUnit),
      supplier: form.supplier,
    };
    try {
      if (editing) { await updateIngredient(editing, data); toast.success("Ingredient updated!"); }
      else { await addIngredient(data); toast.success("Ingredient added!"); }
      setForm(empty); setEditing(null); setShowForm(false); load();
    } catch (err) { toast.error("Failed: " + err.message); }
    finally { setSaving(false); }
  };

  const handleEdit = (item) => {
    setForm({ name:item.name, category:item.category, unit:item.unit, stock:item.stock, minStock:item.minStock, costPerUnit:item.costPerUnit, supplier:item.supplier||"" });
    setEditing(item.id); setShowForm(true);
    window.scrollTo({ top:0, behavior:"smooth" });
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this ingredient?")) return;
    await deleteIngredient(id); toast.success("Deleted."); load();
  };

  const handleRestock = async (id) => {
    if (!restockQty || Number(restockQty) <= 0) return toast.error("Enter a valid quantity.");
    const item = ingredients.find(i => i.id === id);
    await updateIngredient(id, { stock: Number(item.stock) + Number(restockQty) });
    toast.success(`Restocked +${restockQty} ${item.unit}`);
    setRestockId(null); setRestockQty(""); load();
  };

  const inp = { width:"100%", padding:"9px 12px", border:"1px solid #e8e2d9", borderRadius:8, fontSize:13, background:"#fdfcfb", outline:"none", color:"#1a1814", fontFamily:"inherit" };
  const lbl = { fontSize:11, fontWeight:600, color:"#9a9690", display:"block", marginBottom:5, textTransform:"uppercase", letterSpacing:"0.5px" };

  const stockStatus = (item) => {
    if (Number(item.stock) <= 0) return { label:"Out of stock", color:"#dc2626", bg:"#fef2f2" };
    if (Number(item.stock) <= Number(item.minStock)) return { label:`Low: ${item.stock} ${item.unit}`, color:"#b45309", bg:"#fff7ed" };
    return { label:`${item.stock} ${item.unit}`, color:"#166534", bg:"#f0fdf4" };
  };

  return React.createElement("div", { style: { display:"flex", flexDirection:"column", gap:20 } },
    // Header
    React.createElement("div", { style: { display:"flex", justifyContent:"space-between", alignItems:"center" } },
      React.createElement("div", null,
        React.createElement("h2", { style: { fontSize:20, fontWeight:700, color:"#1a1814", letterSpacing:"-0.5px" } }, "Ingredient Inventory"),
        React.createElement("p", { style: { fontSize:13, color:"#9a9690", marginTop:2 } }, ingredients.length, " ingredients tracked")
      ),
      React.createElement("button", { 
        onClick: () => { setForm(empty); setEditing(null); setShowForm(!showForm); },
        style: { padding:"9px 18px", borderRadius:10, background:showForm?"#f0ede8":"#1a1814", color:showForm?"#6b6860":"#fff", border:"none", fontSize:13, fontWeight:600, cursor:"pointer" }
      }, showForm ? "✕ Cancel" : "+ Add Ingredient")
    ),

    // Alerts
    (lowItems.length > 0 || outItems.length > 0) && React.createElement("div", { style: { background:"#fff7ed", border:"1px solid #fed7aa", borderRadius:12, padding:"14px 18px" } },
      React.createElement("div", { style: { fontSize:13, fontWeight:600, color:"#b45309", marginBottom:10 } }, "⚠️ Stock Alerts"),
      React.createElement("div", { style: { display:"flex", flexDirection:"column", gap:6 } },
        outItems.map(i => React.createElement("div", { key: i.id, style: { display:"flex", justifyContent:"space-between", fontSize:12 } },
          React.createElement("span", { style: { color:"#1a1814", fontWeight:500 } }, i.name),
          React.createElement("span", { style: { color:"#dc2626", fontWeight:600 } }, "Out of stock")
        )),
        lowItems.map(i => React.createElement("div", { key: i.id, style: { display:"flex", justifyContent:"space-between", fontSize:12 } },
          React.createElement("span", { style: { color:"#1a1814", fontWeight:500 } }, i.name),
          React.createElement("span", { style: { color:"#b45309", fontWeight:600 } }, "Only ", i.stock, " ", i.unit, " left (min: ", i.minStock, ")")
        ))
      )
    ),

    // Add/Edit Form
    showForm && React.createElement("form", { onSubmit: handleSubmit, style: { background:"#fff", border:"1px solid #e8e2d9", borderRadius:16, overflow:"hidden" } },
      React.createElement("div", { style: { padding:"16px 24px", borderBottom:"1px solid #f0ede8", background:"#fdfcfb" } },
        React.createElement("div", { style: { fontSize:15, fontWeight:700, color:"#1a1814" } }, editing ? "Edit Ingredient" : "New Ingredient")
      ),
      React.createElement("div", { style: { padding:24, display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14 } },
        React.createElement("div", { style: { gridColumn:"1/-1" } },
          React.createElement("label", { style: lbl }, "Ingredient Name"),
          React.createElement("input", { style: inp, value: form.name, onChange: e => setForm(f=>({...f,name:e.target.value})), placeholder: "e.g. Arabica Coffee Beans", required: true })
        ),
        React.createElement("div", null,
          React.createElement("label", { style: lbl }, "Category"),
          React.createElement("select", { style: inp, value: form.category, onChange: e => setForm(f=>({...f,category:e.target.value})) },
            CATEGORIES.map(c => React.createElement("option", { key: c }, c))
          )
        ),
        React.createElement("div", null,
          React.createElement("label", { style: lbl }, "Unit"),
          React.createElement("select", { style: inp, value: form.unit, onChange: e => setForm(f=>({...f,unit:e.target.value})) },
            UNITS.map(u => React.createElement("option", { key: u }, u))
          )
        ),
        React.createElement("div", null,
          React.createElement("label", { style: lbl }, "Supplier"),
          React.createElement("input", { style: inp, value: form.supplier, onChange: e => setForm(f=>({...f,supplier:e.target.value})), placeholder: "e.g. Benguet Coffee" })
        ),
        React.createElement("div", null,
          React.createElement("label", { style: lbl }, "Current Stock"),
          React.createElement("input", { type: "number", min: "0", style: inp, value: form.stock, onChange: e => setForm(f=>({...f,stock:e.target.value})), placeholder: "0", required: true })
        ),
        React.createElement("div", null,
          React.createElement("label", { style: lbl }, "Min Stock (alert threshold)"),
          React.createElement("input", { type: "number", min: "0", style: inp, value: form.minStock, onChange: e => setForm(f=>({...f,minStock:e.target.value})), placeholder: "0", required: true })
        ),
        React.createElement("div", null,
          React.createElement("label", { style: lbl }, "Cost per Unit (₱)"),
          React.createElement("input", { type: "number", min: "0", step: "0.01", style: inp, value: form.costPerUnit, onChange: e => setForm(f=>({...f,costPerUnit:e.target.value})), placeholder: "0.00", required: true })
        ),
        React.createElement("div", { style: { gridColumn:"1/-1", display:"flex", gap:10 } },
          React.createElement("button", { type: "submit", disabled: saving,
            style: { padding:"10px 24px", borderRadius:10, background:saving?"#d0ccc4":"#1a1814", color:saving?"#9a9690":"#fff", border:"none", fontSize:13, fontWeight:600, cursor:saving?"not-allowed":"pointer" }
          }, saving ? "Saving..." : editing ? "Save Changes" : "Add Ingredient"),
          React.createElement("button", { type: "button", onClick: () => { setShowForm(false); setEditing(null); },
            style: { padding:"10px 18px", borderRadius:10, background:"none", border:"1px solid #e8e2d9", fontSize:13, color:"#6b6860", cursor:"pointer" }
          }, "Cancel")
        )
      )
    ),

    // Filter Tabs
    React.createElement("div", { style: { display:"flex", gap:8, flexWrap:"wrap" } },
      ["All","Low Stock","Out of Stock",...CATEGORIES].map(f => 
        React.createElement("button", { key: f, onClick: () => setFilter(f),
          style: { padding:"5px 12px", borderRadius:20, fontSize:11, fontWeight:500, border: filter===f?"1px solid #1a1814":"1px solid #e8e2d9", background: filter===f?"#1a1814":"transparent", color: filter===f?"#fff":"#6b6860", cursor:"pointer", whiteSpace:"nowrap" }
        },
          f,
          f==="Low Stock" && lowItems.length > 0 && React.createElement("span", { style: { marginLeft:5, background:"#b45309", color:"#fff", borderRadius:10, padding:"1px 6px", fontSize:10 } }, lowItems.length),
          f==="Out of Stock" && outItems.length > 0 && React.createElement("span", { style: { marginLeft:5, background:"#dc2626", color:"#fff", borderRadius:10, padding:"1px 6px", fontSize:10 } }, outItems.length)
        )
      )
    ),

    // Ingredients Table
    loading ? React.createElement("p", { style: { fontSize:13, color:"#9a9690" } }, "Loading...") :
    filtered.length === 0 ? 
      React.createElement("div", { style: { background:"#fff", border:"1px solid #e8e2d9", borderRadius:12, padding:40, textAlign:"center" } },
        React.createElement("div", { style: { fontSize:32, marginBottom:8 } }, "📦"),
        React.createElement("p", { style: { fontSize:13, color:"#9a9690" } }, "No ingredients found. Add your first ingredient above.")
      ) :
      React.createElement("div", { style: { background:"#fff", border:"1px solid #e8e2d9", borderRadius:12, overflow:"hidden" } },
        React.createElement("table", { style: { width:"100%", borderCollapse:"collapse", fontSize:13 } },
          React.createElement("thead", null,
            React.createElement("tr", { style: { background:"#f5f3ee" } },
              ["Ingredient","Category","Stock","Min Stock","Cost/Unit","Supplier","Actions"].map(h => 
                React.createElement("th", { key: h, style: { padding:"10px 14px", textAlign:"left", fontSize:11, fontWeight:600, color:"#9a9690", borderBottom:"1px solid #e8e2d9", textTransform:"uppercase", letterSpacing:"0.5px", whiteSpace:"nowrap" } }, h)
              )
            )
          ),
          React.createElement("tbody", null,
            filtered.map(item => {
              const status = stockStatus(item);
              return React.createElement("tr", { key: item.id, style: { borderBottom:"1px solid #f5f3ee" } },
                React.createElement("td", { style: { padding:"12px 14px", fontWeight:600, color:"#1a1814" } }, item.name),
                React.createElement("td", { style: { padding:"12px 14px" } },
                  React.createElement("span", { style: { fontSize:11, padding:"2px 8px", borderRadius:20, background:"#f5f3ee", color:"#6b6860" } }, item.category)
                ),
                React.createElement("td", { style: { padding:"12px 14px" } },
                  restockId === item.id ? 
                    React.createElement("div", { style: { display:"flex", gap:6, alignItems:"center" } },
                      React.createElement("input", { type: "number", min: "1", value: restockQty, onChange: e => setRestockQty(e.target.value), placeholder: "+qty", autoFocus: true, style: { width:70, padding:"5px 8px", border:"1px solid #e8e2d9", borderRadius:6, fontSize:12 } }),
                      React.createElement("button", { onClick: () => handleRestock(item.id), style: { padding:"4px 8px", borderRadius:6, background:"#166534", color:"#fff", border:"none", fontSize:11, cursor:"pointer", fontWeight:600 } }, "+Add"),
                      React.createElement("button", { onClick: () => { setRestockId(null); setRestockQty(""); }, style: { padding:"4px 6px", borderRadius:6, background:"none", border:"1px solid #e8e2d9", fontSize:11, cursor:"pointer" } }, "✕")
                    ) :
                    React.createElement("span", { style: { fontSize:12, padding:"3px 10px", borderRadius:20, fontWeight:500, background:status.bg, color:status.color } }, status.label)
                ),
                React.createElement("td", { style: { padding:"12px 14px", color:"#9a9690", fontSize:12 } }, item.minStock, " ", item.unit),
                React.createElement("td", { style: { padding:"12px 14px", color:"#1a1814", fontWeight:500 } }, formatCurrency(item.costPerUnit), "/", item.unit),
                React.createElement("td", { style: { padding:"12px 14px", color:"#6b6860" } }, item.supplier || "—"),
                React.createElement("td", { style: { padding:"12px 14px" } },
                  React.createElement("div", { style: { display:"flex", gap:6 } },
                    React.createElement("button", { onClick: () => { setRestockId(item.id); setRestockQty(""); }, style: { padding:"5px 10px", borderRadius:6, border:"1px solid #bbf7d0", background:"#f0fdf4", fontSize:11, color:"#166534", cursor:"pointer", fontWeight:600 } }, "Restock"),
                    React.createElement("button", { onClick: () => handleEdit(item), style: { padding:"5px 10px", borderRadius:6, border:"1px solid #e8e2d9", background:"none", fontSize:11, color:"#1a1814", cursor:"pointer" } }, "Edit"),
                    React.createElement("button", { onClick: () => handleDelete(item.id), style: { padding:"5px 10px", borderRadius:6, border:"1px solid #fca5a5", background:"none", fontSize:11, color:"#dc2626", cursor:"pointer" } }, "Delete")
                  )
                )
              );
            })
          )
        )
      )
  );
}