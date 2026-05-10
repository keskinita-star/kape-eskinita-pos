import { useState } from "react";
import { SIZES } from "../../utils/constants";
import { formatCurrency } from "../../utils/formatters";

export default function SizeModal({ product, onConfirm, onClose }) {
  const [selectedSize, setSelectedSize] = useState(SIZES[0]);

  const finalPrice = product.price + selectedSize.priceAdd;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}>
      <div style={{ background:"#fff", borderRadius:16, padding:28, width:"100%", maxWidth:360, boxShadow:"0 20px 60px rgba(0,0,0,0.15)" }}>

        {/* Product Info */}
        <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:20 }}>
          <div style={{ width:60, height:60, borderRadius:10, overflow:"hidden", background:"#f5f3ee", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            {product.photoUrl
              ? <img src={product.photoUrl} alt={product.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
              : <span style={{ fontSize:28 }}>☕</span>}
          </div>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:"#1a1814" }}>{product.name}</div>
            <div style={{ fontSize:12, color:"#9a9690", marginTop:2 }}>Select a size</div>
          </div>
        </div>

        {/* Size Options */}
        <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:24 }}>
          {SIZES.map(size => {
            const price = product.price + size.priceAdd;
            const isSelected = selectedSize.label === size.label;
            return (
              <button key={size.label} type="button" onClick={() => setSelectedSize(size)}
                style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 16px", borderRadius:12, border: isSelected ? "2px solid #1a1814" : "1px solid #e8e2d9", background: isSelected ? "#1a1814" : "#fff", cursor:"pointer", transition:"all 0.15s" }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:20, height:20, borderRadius:"50%", border: isSelected ? "2px solid #fff" : "2px solid #d0ccc4", background: isSelected ? "#fff" : "transparent", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    {isSelected && <div style={{ width:10, height:10, borderRadius:"50%", background:"#1a1814" }} />}
                  </div>
                  <div style={{ textAlign:"left" }}>
                    <div style={{ fontSize:14, fontWeight:600, color: isSelected ? "#fff" : "#1a1814" }}>{size.label}</div>
                    {size.priceAdd > 0 && <div style={{ fontSize:11, color: isSelected ? "#d0ccc4" : "#9a9690" }}>+₱{size.priceAdd}</div>}
                  </div>
                </div>
                <div style={{ fontSize:15, fontWeight:700, color: isSelected ? "#fff" : "#1a1814" }}>{formatCurrency(price)}</div>
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onClose}
            style={{ flex:1, padding:"11px", borderRadius:10, border:"1px solid #e8e2d9", background:"none", fontSize:13, color:"#6b6860", cursor:"pointer", fontWeight:500 }}>
            Cancel
          </button>
          <button onClick={() => onConfirm(product, selectedSize)}
            style={{ flex:2, padding:"11px", borderRadius:10, border:"none", background:"#1a1814", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>
            Add to Order — {formatCurrency(finalPrice)}
          </button>
        </div>
      </div>
    </div>
  );
}