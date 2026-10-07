import React, { useState, useEffect, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Search, Filter, ShieldAlert, ShieldCheck, ZoomIn } from 'lucide-react';

// ─── Theme & Mapping ───────────────────────────────────────────────
const C = { bg: '#0a0d14', surface: '#111827', border: '#1f2937', cyan: '#06b6d4', green: '#22c55e', amber: '#f59e0b', red: '#ef4444', muted: '#6b7280', text: '#f1f5f9', textDim: '#94a3b8' };

const NODE_COLORS = { account: '#3b82f6', device: '#a855f7', ip: '#06b6d4', merchant: '#f59e0b', fraud: '#ef4444' };
const NODE_RADIUS = { fraud: 14, account: 9, device: 8, ip: 7, merchant: 9 };
const GROUPS = { account: 'User Account', device: 'Device', ip: 'IP Address', merchant: 'Merchant', fraud: 'Fraud Ring Entity' };

// ─── Canvas Drawing Helpers ────────────────────────────────────────
function lighten(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((n >> 16) & 0xff) + 80), g = Math.min(255, ((n >> 8) & 0xff) + 80), b = Math.min(255, (n & 0xff) + 80);
  return `rgb(${r},${g},${b})`;
}

function drawNode(node, ctx, globalScale, selectedId) {
  if (node.x === undefined || node.y === undefined) return;
  const x = node.x, y = node.y, isFraud = node.group === 'fraud', isSelected = node.id === selectedId;
  const color = NODE_COLORS[node.group] || '#888', r = NODE_RADIUS[node.group] || 8;

  // Glow
  const glowColor = isFraud ? 'rgba(239,68,68,0.35)' : isSelected ? 'rgba(255,255,255,0.25)' : `${color}30`;
  const grad = ctx.createRadialGradient(x, y, r * 0.5, x, y, isFraud ? r + 10 : r + 5);
  grad.addColorStop(0, glowColor); grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.beginPath(); ctx.arc(x, y, isFraud ? r + 10 : r + 5, 0, Math.PI * 2); ctx.fillStyle = grad; ctx.fill();

  // Core
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  const coreGrad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  coreGrad.addColorStop(0, isFraud ? '#ff8080' : lighten(color)); coreGrad.addColorStop(1, color);
  ctx.fillStyle = coreGrad; ctx.fill();

  // Border
  ctx.strokeStyle = isSelected ? '#ffffff' : isFraud ? '#ff2222' : `${color}cc`;
  ctx.lineWidth = isSelected ? 2.5 : isFraud ? 2 : 1; ctx.stroke();

  // Label
  const fontSize = Math.max(3, Math.min(11, 10 / globalScale));
  ctx.font = `${isFraud ? 'bold ' : ''}${fontSize}px "IBM Plex Mono", monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  const tw = ctx.measureText(node.id).width, lx = x - tw / 2 - 2, ly = y + r + 2, lh = fontSize + 3;
  ctx.fillStyle = isFraud ? 'rgba(80,0,0,0.85)' : 'rgba(10,13,20,0.75)';
  ctx.beginPath(); ctx.roundRect(lx, ly, tw + 4, lh, 2); ctx.fill();
  ctx.fillStyle = isFraud ? '#ff9999' : isSelected ? '#fff' : '#cbd5e1'; ctx.fillText(node.id, x, ly + 1.5); ctx.textBaseline = 'alphabetic';
}

// ─── Main Component ───────────────────────────────────────────────
export default function GraphExplorer({ graphData }) {
  const fgRef = useRef(), containerRef = useRef();
  const [selectedNode, setSelectedNode] = useState(null);
  const [dims, setDims] = useState({ w: 800, h: 600 });
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ account: true, device: true, ip: true, fraud: true, merchant: true });

  // Auto-resize graph container
  useEffect(() => {
    const el = containerRef.current; if (!el) return;
    const obs = new ResizeObserver(([e]) => setDims({ w: e.contentRect.width, h: e.contentRect.height }));
    obs.observe(el); setDims({ w: el.clientWidth, h: el.clientHeight }); return () => obs.disconnect();
  }, []);

  // Filter Data
  const visibleNodes = graphData.nodes.filter(n => filters[n.group] && (searchTerm === '' || n.id.toLowerCase().includes(searchTerm.toLowerCase())));
  const visibleIds = new Set(visibleNodes.map(n => n.id));
  const visibleLinks = graphData.links.filter(l => visibleIds.has(l.source?.id || l.source) && visibleIds.has(l.target?.id || l.target));
  
  // Handlers
  const toggleFilter = (groupId) => setFilters(prev => ({ ...prev, [groupId]: !prev[groupId] }));

  const focusOnNode = (node) => {
    if (fgRef.current && node) {
      fgRef.current.centerAt(node.x, node.y, 1000);
      fgRef.current.zoom(4, 1000);
      setSelectedNode(node);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const found = graphData.nodes.find(n => n.id.toLowerCase().includes(searchTerm.toLowerCase()));
    if (found) focusOnNode(found);
    else alert('Entity not found in current graph state.');
  };

  const handleAction = (action) => {
    if (!selectedNode) return;
    alert(`[API Request Sent]: ${action} initiated for entity ${selectedNode.id}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)', background: C.bg, overflow: 'hidden', fontFamily: 'inherit' }}>
      
      {/* Embedded CSS for sleek UI */}
      <style>{`
        .action-btn { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 10px; border-radius: 6px; font-weight: 600; font-size: 13px; cursor: pointer; transition: all 0.2s; border: none; }
        .btn-block { background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.4); }
        .btn-block:hover { background: #ef4444; color: #fff; }
        .btn-safe { background: rgba(34, 197, 94, 0.15); color: #22c55e; border: 1px solid rgba(34, 197, 94, 0.4); }
        .btn-safe:hover { background: #22c55e; color: #fff; }
        .btn-focus { background: rgba(6, 182, 212, 0.15); color: #06b6d4; border: 1px solid rgba(6, 182, 212, 0.4); }
        .btn-focus:hover { background: #06b6d4; color: #fff; }
        .filter-cb:checked + span { box-shadow: 0 0 8px currentColor; }
      `}</style>

      {/* Header Section */}
      <div style={{ padding: '20px 32px', borderBottom: `1px solid ${C.border}`, background: C.surface, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: C.text, fontSize: 24, fontWeight: 700, margin: 0 }}>Network Intelligence</h1>
          <p style={{ color: C.muted, fontSize: 13, margin: '4px 0 0' }}>Real-time topology and anomaly investigation</p>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          <div style={{ textAlign: 'right' }}><div style={{ fontSize: 20, color: C.cyan, fontWeight: 700 }}>{graphData.nodes.length}</div><div style={{ fontSize: 11, color: C.muted }}>Active Nodes</div></div>
          <div style={{ textAlign: 'right' }}><div style={{ fontSize: 20, color: C.text, fontWeight: 700 }}>{graphData.links.length}</div><div style={{ fontSize: 11, color: C.muted }}>Connections</div></div>
          <div style={{ textAlign: 'right' }}><div style={{ fontSize: 20, color: C.red, fontWeight: 700 }}>{graphData.meta?.fraud_nodes || 0}</div><div style={{ fontSize: 11, color: C.muted }}>Anomalies</div></div>
        </div>
      </div>

      {/* Main Content (Graph + Sidebar) */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* Canvas Area */}
        <div ref={containerRef} style={{ flex: 1, position: 'relative' }}>
          
          {/* Floating Search Bar */}
          <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 10 }}>
            <form onSubmit={handleSearch} style={{ display: 'flex', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '4px 4px 4px 12px', alignItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
              <input type="text" placeholder="Search Entity ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ background: 'transparent', border: 'none', color: C.text, fontSize: 13, width: 200, outline: 'none' }} />
              <button type="submit" style={{ background: C.cyan, border: 'none', borderRadius: 4, padding: '6px 10px', cursor: 'pointer', color: '#000', display: 'flex', alignItems: 'center' }}>
                <Search size={16} strokeWidth={2.5} />
              </button>
            </form>
          </div>

          <ForceGraph2D
            ref={fgRef} width={dims.w} height={dims.h}
            graphData={{ nodes: visibleNodes, links: visibleLinks }}
            nodeLabel={() => ''} nodeRelSize={1}
            nodeCanvasObject={(node, ctx, gs) => drawNode(node, ctx, gs, selectedNode?.id)}
            nodeCanvasObjectMode={() => 'replace'}
            linkColor={l => l.fraud ? 'rgba(239,68,68,0.75)' : 'rgba(100,130,180,0.25)'}
            linkWidth={l => l.fraud ? 2.5 : 1}
            linkDirectionalArrowLength={l => l.fraud ? 6 : 3}
            linkDirectionalArrowRelPos={1}
            linkDirectionalParticles={l => l.fraud ? 4 : 0}
            linkDirectionalParticleColor={() => C.red}
            backgroundColor={C.bg}
            onNodeClick={node => { setSelectedNode(node); focusOnNode(node); }}
            onBackgroundClick={() => setSelectedNode(null)}
            cooldownTicks={120} d3AlphaDecay={0.02} d3VelocityDecay={0.3}
          />
        </div>

        {/* Sidebar */}
        <aside style={{ width: 320, background: C.surface, borderLeft: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column' }}>
          
          {/* Filters */}
          <div style={{ padding: '20px', borderBottom: `1px solid ${C.border}` }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.text, margin: '0 0 16px', letterSpacing: '0.05em' }}>
              <Filter size={16} color={C.cyan} /> ENTITY FILTERS
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Object.keys(NODE_COLORS).map(id => (
                <label key={id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: filters[id] ? C.text : C.muted, transition: 'all 0.2s' }}>
                  <input type="checkbox" className="filter-cb" checked={filters[id] ?? false} onChange={() => toggleFilter(id)} style={{ accentColor: NODE_COLORS[id], width: 14, height: 14 }} />
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: NODE_COLORS[id], flexShrink: 0 }} />
                  {GROUPS[id] || id}
                </label>
              ))}
            </div>
          </div>

          {/* Selected Entity Details */}
          <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
            <h3 style={{ fontSize: 13, color: C.text, margin: '0 0 16px', letterSpacing: '0.05em' }}>INVESTIGATION PROFILE</h3>
            
            {selectedNode ? (
              <div style={{ background: C.bg, border: `1px solid ${selectedNode.group === 'fraud' ? C.red : C.border}`, borderRadius: 8, padding: '16px', boxShadow: selectedNode.group === 'fraud' ? '0 0 15px rgba(239,68,68,0.1)' : 'none' }}>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: `${NODE_COLORS[selectedNode.group]}20`, border: `2px solid ${NODE_COLORS[selectedNode.group]}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: NODE_COLORS[selectedNode.group], fontWeight: 800 }}>
                    {selectedNode.id.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: C.text, fontFamily: 'monospace' }}>{selectedNode.id}</div>
                    <div style={{ fontSize: 11, color: NODE_COLORS[selectedNode.group], fontWeight: 600 }}>{GROUPS[selectedNode.group]?.toUpperCase()}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${C.border}`, paddingBottom: 8, marginBottom: 8, fontSize: 12 }}>
                  <span style={{ color: C.muted }}>Risk Score</span>
                  <span style={{ color: selectedNode.risk > 70 ? C.red : C.green, fontWeight: 700 }}>{selectedNode.risk ?? 'N/A'}/100</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 16, fontSize: 12 }}>
                  <span style={{ color: C.muted }}>AI Decision</span>
                  <span style={{ color: C.text, fontWeight: 700 }}>{selectedNode.rl_decision ?? 'N/A'}</span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button className="action-btn btn-block" onClick={() => handleAction('Isolate & Block')}>
                    <ShieldAlert size={16} /> Block Entity
                  </button>
                  <button className="action-btn btn-safe" onClick={() => handleAction('Mark as Safe')}>
                    <ShieldCheck size={16} /> Whitelist
                  </button>
                  <button className="action-btn btn-focus" onClick={() => focusOnNode(selectedNode)}>
                    <ZoomIn size={16} /> Re-Focus Camera
                  </button>
                </div>

              </div>
            ) : (
              <div style={{ border: `1px dashed ${C.border}`, borderRadius: 8, padding: '32px 16px', textAlign: 'center', color: C.muted }}>
                <ZoomIn size={32} style={{ opacity: 0.5, marginBottom: 12 }} />
                <div style={{ fontSize: 13, lineHeight: 1.5 }}>Select an entity on the canvas to view details and take action.</div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}