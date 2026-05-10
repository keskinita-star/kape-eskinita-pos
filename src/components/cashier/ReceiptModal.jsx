import { formatCurrency, formatDateTime } from "../../utils/formatters";

export default function ReceiptModal({ order, onClose }) {
  const { items, subtotal, tax, total, payment, cashierName, createdAt } = order;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}>
      <div style={{ background:"#fff", borderRadius:16, padding:28, width:"100%", maxWidth:360, boxShadow:"0 20px 60px rgba(0,0,0,0.15)" }}>
        {/* Receipt */}
        <div style={{ fontFamily:"'Courier New', monospace", fontSize:13, color:"#1a1814" }}>
          {/* Header */}
          <div style={{ textAlign:"center", marginBottom:16 }}>
            <div style={{ fontSize:22 }}>☕</div>
            <div style={{ fontSize:16, fontWeight:700, letterSpacing:1, marginTop:4 }}>KAPE ESKINITA</div>
            <div style={{ fontSize:11, color:"#9a9690", marginTop:2 }}>Official Receipt</div>
            <div style={{ fontSize:11, color:"#9a9690", marginTop:2 }}>{formatDateTime(createdAt)}</div>
            <div style={{ fontSize:11, color:"#9a9690" }}>Cashier: {cashierName}</div>
          </div>

          <div style={{ borderTop:"1px dashed #d0ccc4", borderBottom:"1px dashed #d0ccc4", padding:"12px 0", marginBottom:12 }}>
            {items.map((item, i) => (
              <div key={i} style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <div>
                  <div style={{ fontWeight:500 }}>{item.name}</div>
                  <div style={{ fontSize:11, color:"#9a9690" }}>x{item.qty} @ {formatCurrency(item.price)}</div>
                </div>
                <div style={{ fontWeight:500 }}>{formatCurrency(item.price * item.qty)}</div>
              </div>
            ))}
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#6b6860" }}>
              <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#6b6860" }}>
              <span>VAT (12%)</span><span>{formatCurrency(tax)}</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:15, fontWeight:700 }}>
              <span>TOTAL</span><span>{formatCurrency(total)}</span>
            </div>
          </div>

          <div style={{ background:"#f5f3ee", borderRadius:8, padding:"10px 12px", marginBottom:16, fontSize:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between" }}>
              <span style={{ color:"#6b6860" }}>Payment</span>
              <span style={{ fontWeight:600 }}>{payment.method}</span>
            </div>
            {payment.method === "Cash" && <>
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
                <span style={{ color:"#6b6860" }}>Cash Given</span>
                <span>{formatCurrency(payment.cashGiven)}</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
                <span style={{ color:"#6b6860" }}>Change</span>
                <span style={{ fontWeight:600, color:"#166534" }}>{formatCurrency(payment.change)}</span>
              </div>
            </>}
          </div>

          <div style={{ textAlign:"center", fontSize:11, color:"#9a9690", marginBottom:16 }}>
            Thank you for visiting Kape Eskinita!<br />
            Please come again ☕
          </div>
        </div>

        <button onClick={onClose}
          style={{ width:"100%", padding:"11px", borderRadius:10, background:"#1a1814", color:"#fff", border:"none", fontSize:13, fontWeight:700, cursor:"pointer" }}>
          Close Receipt
        </button>
      </div>
    </div>
  );
}