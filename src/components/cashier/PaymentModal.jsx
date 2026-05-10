import { useState } from "react";
import { PAYMENT_METHODS } from "../../utils/constants";
import { formatCurrency } from "../../utils/formatters";

export default function PaymentModal({ total, onConfirm, onClose }) {
  const [method, setMethod] = useState("Cash");
  const [cashGiven, setCashGiven] = useState("");
  const change = method === "Cash" ? Math.max(0, Number(cashGiven) - total) : 0;
  const canConfirm = method !== "Cash" || (Number(cashGiven) >= total && cashGiven !== "");

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}>
      <div style={{ background:"#fff", borderRadius:16, padding:28, width:"100%", maxWidth:400, boxShadow:"0 20px 60px rgba(0,0,0,0.15)" }}>
        <div style={{ fontSize:17, fontWeight:700, color:"#1a1814", marginBottom:20 }}>Accept Payment</div>

        {/* Total */}
        <div style={{ background:"#f5f3ee", borderRadius:12, padding:"16px 20px", textAlign:"center", marginBottom:20 }}>
          <div style={{ fontSize:12, color:"#9a9690", marginBottom:4 }}>Total Amount Due</div>
          <div style={{ fontSize:28, fontWeight:700, color:"#1a1814", letterSpacing:"-1px" }}>{formatCurrency(total)}</div>
        </div>

        {/* Payment Method */}
        <div style={{ marginBottom:18 }}>
          <div style={{ fontSize:11, fontWeight:600, color:"#9a9690", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:10 }}>Payment Method</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
            {PAYMENT_METHODS.map(m => (
              <button key={m} type="button" onClick={() => { setMethod(m); setCashGiven(""); }}
                style={{ padding:"10px 8px", borderRadius:10, border: method===m ? "2px solid #1a1814" : "1px solid #e8e2d9", background: method===m ? "#1a1814" : "#fff", color: method===m ? "#fff" : "#6b6860", fontSize:13, fontWeight:600, cursor:"pointer", transition:"all 0.15s" }}>
                {m === "Cash" ? "💵 Cash" : m === "GCash" ? "📱 GCash" : "📲 Maya"}
              </button>
            ))}
          </div>
        </div>

        {/* Cash Input */}
        {method === "Cash" && (
          <div style={{ marginBottom:18 }}>
            <div style={{ fontSize:11, fontWeight:600, color:"#9a9690", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:8 }}>Cash Given</div>
            <input
              type="number" value={cashGiven} onChange={e => setCashGiven(e.target.value)}
              placeholder="Enter amount"
              style={{ width:"100%", padding:"11px 14px", border:"1px solid #e8e2d9", borderRadius:10, fontSize:18, fontWeight:600, color:"#1a1814", background:"#fdfcfb", outline:"none", textAlign:"right" }}
              autoFocus
            />
            {/* Quick amounts */}
            <div style={{ display:"flex", gap:6, marginTop:8, flexWrap:"wrap" }}>
              {[20, 50, 100, 200, 500, 1000].filter(a => a >= total).slice(0,4).map(a => (
                <button key={a} type="button" onClick={() => setCashGiven(String(a))}
                  style={{ padding:"5px 12px", borderRadius:20, border:"1px solid #e8e2d9", background:"#f5f3ee", fontSize:12, color:"#1a1814", cursor:"pointer", fontWeight:500 }}>
                  ₱{a}
                </button>
              ))}
            </div>
            {cashGiven && Number(cashGiven) >= total && (
              <div style={{ marginTop:12, padding:"10px 14px", background:"#f0fdf4", borderRadius:10, display:"flex", justifyContent:"space-between", fontSize:14 }}>
                <span style={{ color:"#166534", fontWeight:500 }}>Change</span>
                <span style={{ color:"#166534", fontWeight:700 }}>{formatCurrency(change)}</span>
              </div>
            )}
          </div>
        )}

        {(method === "GCash" || method === "Maya") && (
          <div style={{ marginBottom:18, padding:"14px", background:"#f0f9ff", border:"1px solid #bae6fd", borderRadius:10, textAlign:"center" }}>
            <div style={{ fontSize:13, color:"#0369a1", fontWeight:500 }}>Ask customer to send {formatCurrency(total)}</div>
            <div style={{ fontSize:12, color:"#0369a1", marginTop:4 }}>via {method} then confirm once received</div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onClose}
            style={{ flex:1, padding:"11px", borderRadius:10, border:"1px solid #e8e2d9", background:"none", fontSize:13, color:"#6b6860", cursor:"pointer", fontWeight:500 }}>
            Cancel
          </button>
          <button onClick={() => onConfirm({ method, cashGiven: Number(cashGiven), change })} disabled={!canConfirm}
            style={{ flex:2, padding:"11px", borderRadius:10, border:"none", background: canConfirm ? "#1a1814" : "#d0ccc4", color: canConfirm ? "#fff" : "#9a9690", fontSize:13, fontWeight:700, cursor: canConfirm ? "pointer" : "not-allowed" }}>
            Confirm Payment
          </button>
        </div>
      </div>
    </div>
  );
}