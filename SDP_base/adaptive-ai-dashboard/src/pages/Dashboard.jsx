import React from 'react';

const C = { bg: '#0a0d14', surface: '#111827', border: '#1f2937', cyan: '#06b6d4', green: '#22c55e', amber: '#f59e0b', yellow: '#eab308', red: '#ef4444', muted: '#6b7280', text: '#f1f5f9', textDim: '#94a3b8' };
const fmt = n => Number(n).toLocaleString();

function StatCard({ title, value, change, accent, live }) {
  return (
    <div style={{ flex: 1, minWidth: 0, background: C.surface, border: `1px solid ${C.border}`, borderTop: `2px solid ${accent || C.cyan}`, borderRadius: 8, padding: '18px 22px', position: 'relative' }}>
      {live && <span style={{ position: 'absolute', top: 14, right: 14, width: 8, height: 8, borderRadius: '50%', background: C.cyan, boxShadow: `0 0 6px ${C.cyan}`, display: 'inline-block', animation: 'pulse 2s infinite' }} />}
      <div style={{ fontSize: 11, color: C.muted, letterSpacing: '0.08em', fontWeight: 600, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 30, fontWeight: 700, color: C.text, letterSpacing: '-0.02em' }}>{value}</div>
      {change && <div style={{ fontSize: 12, marginTop: 6, color: change.startsWith('+') ? C.green : change.startsWith('-') ? C.amber : C.muted }}>{change.startsWith('+') ? '▲' : change.startsWith('-') ? '▼' : '•'} {change}</div>}
    </div>
  );
}

function LineChart({ data }) {
  if (!data.length) return null;
  const W = 680, H = 220, PX = 40, PY = 20;
  const rates = data.map(d => d.rate);
  const min = Math.min(...rates) - 1, max = Math.max(...rates) + 1;
  const cx = i => PX + (i / (data.length - 1)) * (W - PX * 2);
  const cy = v => PY + (1 - (v - min) / (max - min)) * (H - PY * 2);
  const pts = data.map((d, i) => `${cx(i)},${cy(d.rate)}`).join(' ');
  const area = `M${cx(0)},${cy(data[0].rate)} ` + data.map((d, i) => `L${cx(i)},${cy(d.rate)}`).join(' ') + ` L${cx(data.length - 1)},${H - PY} L${cx(0)},${H - PY} Z`;
  const ticks = [0, 6, 12, 18, 23];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H }}>
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.cyan} stopOpacity="0.25" />
          <stop offset="100%" stopColor={C.cyan} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {[min + 2, min + 6, min + 10, min + 14, min + 18].map((v, i) => (
        v <= max && <g key={i}><line x1={PX} y1={cy(v)} x2={W - PX} y2={cy(v)} stroke={C.border} strokeWidth="1" /><text x={PX - 6} y={cy(v) + 4} fill={C.muted} fontSize="9" textAnchor="end">{Math.round(v)}</text></g>
      ))}
      {ticks.map(i => <text key={i} x={cx(i)} y={H - 4} fill={C.muted} fontSize="9" textAnchor="middle">{data[i]?.hour}</text>)}
      <path d={area} fill="url(#areaGrad)" />
      <polyline points={pts} fill="none" stroke={C.cyan} strokeWidth="2" strokeLinejoin="round" />
      <circle cx={cx(data.length - 1)} cy={cy(rates[rates.length - 1])} r="4" fill={C.cyan} stroke={C.bg} strokeWidth="2" />
    </svg>
  );
}

function BarChart({ data }) {
  if (!data.length) return null;
  const W = 520, H = 220, PX = 30, PY = 20, BAR_W = 60;
  const max = Math.max(...data.map(d => d.count));
  const barX = i => PX + i * ((W - PX * 2) / data.length) + (((W - PX * 2) / data.length) - BAR_W) / 2;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H }}>
      {data.map((d, i) => {
        const barH = ((d.count / max) * (H - PY * 2 - 20));
        const x = barX(i), y = H - PY - 20 - barH;
        return (
          <g key={d.label}>
            <defs>
              <linearGradient id={`bg${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={d.color} stopOpacity="1" /><stop offset="100%" stopColor={d.color} stopOpacity="0.5" />
              </linearGradient>
            </defs>
            <rect x={x} y={y} width={BAR_W} height={barH} fill={`url(#bg${i})`} rx="3" />
            <text x={x + BAR_W / 2} y={y - 5} fill={d.color} fontSize="10" textAnchor="middle" fontWeight="700">{fmt(d.count)}</text>
            <text x={x + BAR_W / 2} y={H - 6} fill={C.muted} fontSize="10" textAnchor="middle">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function Dashboard({ stats, flagRate, decisions }) {
  return (
    <div style={{ padding: '28px 32px' }}>
      <h2 style={{ color: C.textDim, fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', margin: '0 0 16px' }}>LIVE MONITORING</h2>
      <div style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
        <StatCard title="TRANSACTIONS PROCESSED" value={fmt(stats.transactions_processed)} change={stats.tx_change} accent={C.cyan} live />
        <StatCard title="FLAGGED SUSPICIOUS" value={fmt(stats.flagged_suspicious)} change={stats.flag_change} accent={C.amber} live />
        <StatCard title="PENDING REVIEW" value={fmt(stats.pending_review)} change="• 0%" accent={C.yellow} />
        <StatCard title="CONFIRMED FRAUD" value={fmt(stats.confirmed_fraud)} change={stats.fraud_change} accent={C.red} />
      </div>
      <h2 style={{ color: C.textDim, fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', margin: '0 0 16px' }}>TRENDS & INSIGHTS</h2>
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: 3, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ color: C.text, fontWeight: 700, fontSize: 15 }}>Flag Rate (24h)</div>
              <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>Transactions flagged per hour</div>
            </div>
          </div>
          <LineChart data={flagRate} />
        </div>
        <div style={{ flex: 2, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '20px 24px' }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: C.text, fontWeight: 700, fontSize: 15 }}>Decisions Distribution</div>
            <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>Current session outcomes</div>
          </div>
          <BarChart data={decisions} />
          <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
            {decisions.map(d => (
              <span key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: C.muted }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: d.color, display: 'inline-block' }} />{d.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}