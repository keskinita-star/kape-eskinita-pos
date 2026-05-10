import { useState, useEffect } from "react";
import { getAuditLogs } from "../../services/auditService";
import { formatDateTime } from "../../utils/formatters";

const ACTION_COLORS = {
  PLACE_ORDER: { bg:"#f0fdf4", color:"#166534" },
  CREATE_USER: { bg:"#eeeaf9", color:"#4a3d8f" },
  DELETE_USER: { bg:"#fef2f2", color:"#dc2626" },
  UPDATE_USER_ROLE: { bg:"#fef9c3", color:"#854d0e" },
  UPDATE_SETTINGS: { bg:"#f0f9ff", color:"#0369a1" },
  LOGIN: { bg:"#f5f3ee", color:"#6b6860" },
};

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");

  useEffect(() => { getAuditLogs(200).then(l => { setLogs(l); setLoading(false); }); }, []);

  const actions = ["All", ...Object.keys(ACTION_COLORS)];
  const filtered = filter === "All" ? logs : logs.filter(l => l.action === filter);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <div>
        <h2 style={{ fontSize:20, fontWeight:700, color:"#1a1814", letterSpacing:"-0.5px" }}>Audit Logs</h2>
        <p style={{ fontSize:13, color:"#9a9690", marginTop:2 }}>{logs.length} total events</p>
      </div>

      {/* Filter */}
      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
        {actions.map(a => (
          <button key={a} onClick={() => setFilter(a)}
            style={{ padding:"5px 12px", borderRadius:20, fontSize:11, fontWeight:500, border: filter===a ? "1px solid #1a1814" : "1px solid #e8e2d9", background: filter===a ? "#1a1814" : "transparent", color: filter===a ? "#fff" : "#6b6860", cursor:"pointer", whiteSpace:"nowrap" }}>
            {a.replace(/_/g," ")}
          </button>
        ))}
      </div>

      {loading ? <p style={{ fontSize:13, color:"#9a9690" }}>Loading...</p> :
        filtered.length === 0 ? <p style={{ fontSize:13, color:"#9a9690" }}>No logs found.</p> : (
        <div style={{ background:"#fff", border:"1px solid #e8e2d9", borderRadius:12, overflow:"hidden" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead>
              <tr style={{ background:"#f5f3ee" }}>
                {["Timestamp","User","Action","Details"].map(h => (
                  <th key={h} style={{ padding:"10px 16px", textAlign:"left", fontSize:11, fontWeight:600, color:"#9a9690", borderBottom:"1px solid #e8e2d9", textTransform:"uppercase", letterSpacing:"0.5px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(log => {
                const ac = ACTION_COLORS[log.action] || { bg:"#f5f3ee", color:"#6b6860" };
                return (
                  <tr key={log.id} style={{ borderBottom:"1px solid #f5f3ee" }}>
                    <td style={{ padding:"11px 16px", color:"#9a9690", fontSize:12, whiteSpace:"nowrap" }}>{formatDateTime(log.timestamp)}</td>
                    <td style={{ padding:"11px 16px", fontWeight:500, color:"#1a1814" }}>{log.userName}</td>
                    <td style={{ padding:"11px 16px" }}>
                      <span style={{ fontSize:11, padding:"3px 10px", borderRadius:20, fontWeight:600, background:ac.bg, color:ac.color, whiteSpace:"nowrap" }}>
                        {log.action.replace(/_/g," ")}
                      </span>
                    </td>
                    <td style={{ padding:"11px 16px", color:"#6b6860", fontSize:12 }}>{log.details}</td>
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