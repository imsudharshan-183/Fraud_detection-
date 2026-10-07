import React, { useState } from 'react';
import { ShieldAlert, ShieldCheck, AlertTriangle, Search } from 'lucide-react';

const C = {
  bg: '#0a0d14', surface: '#111827', surface2: '#0d111a',
  border: '#1f2937', cyan: '#06b6d4', green: '#22c55e',
  amber: '#f59e0b', red: '#ef4444', muted: '#6b7280',
  text: '#f1f5f9', textDim: '#94a3b8',
};
const fmt = n => Number(n).toLocaleString();

function Badge({ label }) {
  const MAP = {
    CRITICAL:  { bg:'#450a0a', text:'#ef4444', border:'#7f1d1d' },
    HIGH:      { bg:'#422006', text:'#f97316', border:'#7c2d12' },
    MEDIUM:    { bg:'#3d2600', text:'#f59e0b', border:'#78350f' },
    LOW:       { bg:'#052e16', text:'#22c55e', border:'#14532d' },
    ALLOW:     { bg:'#052e16', text:'#22c55e', border:'#166534' },
    BLOCK:     { bg:'#450a0a', text:'#ef4444', border:'#991b1b' },
    CHALLENGE: { bg:'#451a03', text:'#f59e0b', border:'#92400e' },
    REVIEW:    { bg:'#1c1917', text:'#a8a29e', border:'#44403c' },
  };
  const s = MAP[label] || { bg:'#1e293b', text:'#94a3b8', border:'#334155' };
  return (
    <span style={{
      background: s.bg, color: s.text, border: `1px solid ${s.border}`,
      borderRadius: 4, padding: '3px 8px', fontSize: 11,
      fontWeight: 700, letterSpacing: '0.05em', whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}

const FILTERS = ['All', 'Critical', 'High', 'Block', 'Challenge'];
const COLS = ['TIMESTAMP', 'TRANSACTION ID', 'AMOUNT', 'RISK SCORE', 'AI DECISION', 'EXPLANATION', 'ACTIONS'];

export default function Alerts({ alerts }) {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  const filtered = alerts.filter(a => {
    const fOk =
      filter === 'All'       ? true :
      filter === 'Critical'  ? a.severity === 'CRITICAL' :
      filter === 'High'      ? a.severity === 'HIGH' :
      filter === 'Block'     ? a.decision === 'BLOCK' :
      filter === 'Challenge' ? a.decision === 'CHALLENGE' : true;
    const sOk = !search || a.tx_id?.toLowerCase().includes(search.toLowerCase());
    return fOk && sOk;
  });

  const act = (txId, label) => alert(`[API]: ${label} → ${txId}`);

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden', fontFamily: 'inherit',
      background: C.bg,
    }}>
      <style>{`
        .ab { display:inline-flex;align-items:center;justify-content:center;padding:6px;border-radius:4px;cursor:pointer;transition:all .18s;border:none;background:transparent; }
        .ab.blk{color:${C.muted};} .ab.blk:hover{background:rgba(239,68,68,.15);color:${C.red};}
        .ab.ok {color:${C.muted};} .ab.ok:hover {background:rgba(34,197,94,.15); color:${C.green};}
        .pill{padding:6px 16px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s;font-family:inherit;}
        tr.arow:hover td{background:#1a2236 !important;}
      `}</style>

      {/* ── Fixed header ── */}
      <div style={{
        flexShrink: 0, padding: '20px 32px 0',
        background: C.bg,
      }}>
        {/* Title row */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 16 }}>
          <div>
            <h1 style={{ display:'flex', alignItems:'center', gap:10, color: C.text, fontSize:22, fontWeight:700, margin:0 }}>
              <AlertTriangle size={24} color={C.amber}/> Alerts Queue
            </h1>
            <p style={{ color: C.muted, fontSize:12, marginTop:4 }}>
              Real-time transaction monitoring and decisioning queue.
            </p>
          </div>
          {/* Search */}
          <div style={{ display:'flex', background: C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:'6px 12px', alignItems:'center' }}>
            <Search size={14} color={C.muted} style={{ marginRight:8 }}/>
            <input
              type="text" placeholder="Search TXN ID..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ background:'transparent', border:'none', color: C.text, fontSize:13, width:180, outline:'none' }}
            />
          </div>
        </div>

        {/* Filter pills */}
        <div style={{ display:'flex', gap:8, alignItems:'center', paddingBottom:14, borderBottom:`1px solid ${C.border}` }}>
          {FILTERS.map(f => (
            <button key={f} className="pill" onClick={() => setFilter(f)} style={{
              border:`1px solid ${filter===f ? C.cyan : C.border}`,
              background: filter===f ? `${C.cyan}20` : C.surface,
              color: filter===f ? C.cyan : C.textDim,
            }}>{f}</button>
          ))}
          <span style={{ marginLeft:'auto', color: C.muted, fontSize:13, fontWeight:600 }}>
            {filtered.length} transactions
          </span>
        </div>

        {/* Table header — sticky */}
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
          <thead>
            <tr style={{ background: C.surface2 }}>
              {COLS.map(h => (
                <th key={h} style={{
                  padding:'11px 14px', color: C.muted, fontWeight:700,
                  letterSpacing:'0.06em', fontSize:11,
                  textAlign: h === 'ACTIONS' ? 'center' : 'left',
                  borderBottom:`1px solid ${C.border}`,
                  whiteSpace:'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
        </table>
      </div>

      {/* ── Scrollable table body ── */}
      <div style={{ flex:1, overflowY:'auto', minHeight:0 }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <tbody>
            {filtered.length > 0 ? filtered.map((a, i) => (
              <tr key={i} className="arow" style={{ borderBottom:`1px solid ${C.border}` }}>
                <td style={{ padding:'11px 14px', color: C.muted, fontFamily:'monospace', fontSize:11, whiteSpace:'nowrap' }}>
                  {a.timestamp}
                </td>
                <td style={{ padding:'11px 14px', color: C.cyan, fontFamily:'monospace', fontSize:12, fontWeight:600 }}>
                  {a.tx_id}
                </td>
                <td style={{ padding:'11px 14px', color: C.text, fontWeight:700, whiteSpace:'nowrap' }}>
                  ${fmt(a.amount)}
                </td>
                <td style={{ padding:'11px 14px' }}>
                  <span style={{ display:'inline-flex', alignItems:'center', gap:7 }}>
                    <Badge label={a.severity}/>
                    <span style={{ color: C.text, fontSize:12, fontWeight:600 }}>{a.risk_score}</span>
                  </span>
                </td>
                <td style={{ padding:'11px 14px' }}>
                  <Badge label={a.decision}/>
                </td>
                <td style={{ padding:'11px 14px', color: a.severity==='CRITICAL' ? '#fca5a5' : C.textDim, fontSize:12 }}>
                  {a.explanation}
                </td>
                <td style={{ padding:'11px 14px', textAlign:'center' }}>
                  <div style={{ display:'flex', justifyContent:'center', gap:4 }}>
                    <button className="ab blk" onClick={() => act(a.tx_id,'Block & Freeze')} title="Block">
                      <ShieldAlert size={15}/>
                    </button>
                    <button className="ab ok" onClick={() => act(a.tx_id,'Whitelist')} title="Whitelist">
                      <ShieldCheck size={15}/>
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={7} style={{ padding:60, textAlign:'center', color: C.muted, fontSize:13 }}>
                  No alerts match your current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}