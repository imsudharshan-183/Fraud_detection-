import React, { useState, useEffect, useCallback } from 'react';

// Import your 3 new modular pages!
import Dashboard from './pages/Dashboard';
import Alerts from './pages/Alerts';
import GraphExplorer from './pages/GraphExplorer';

const API = 'http://localhost:5000/api';

// Core theme colors for the navigation bar
const C = { 
  bg: '#0a0d14', 
  surface: '#111827', 
  border: '#1f2937', 
  cyan: '#06b6d4', 
  green: '#22c55e', 
  text: '#f1f5f9', 
  muted: '#6b7280' 
};

export default function App() {
  // 1. Router State (Which page are we on?)
  const [page, setPage] = useState('dashboard');
  
  // 2. Data State (Holding the data from Flask)
  const [stats, setStats]         = useState({ transactions_processed: 0, flagged_suspicious: 0, pending_review: 0, confirmed_fraud: 0 });
  const [flagRate, setFlagRate]   = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [alerts, setAlerts]       = useState([]);
  const [graphData, setGraphData] = useState({ nodes: [], links: [], meta: {} });

  // 3. The API Fetcher
  const fetchAll = useCallback(async () => {
    try {
      const [s, f, d, a, g] = await Promise.all([
        fetch(`${API}/stats`).then(r => r.json()),
        fetch(`${API}/flag_rate`).then(r => r.json()),
        fetch(`${API}/decisions`).then(r => r.json()),
        fetch(`${API}/alerts`).then(r => r.json()),
        fetch(`${API}/fraud_graph`).then(r => r.json()),
      ]);
      setStats(s); 
      setFlagRate(f); 
      setDecisions(d); 
      setAlerts(a); 
      setGraphData(g);
    } catch (e) {
      console.error('Backend unreachable — is Flask running on :5000?', e);
    }
  }, []);

  // 4. Live Polling (Fetch new data every 8 seconds)
  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, 8000);
    return () => clearInterval(id);
  }, [fetchAll]);

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: '"IBM Plex Mono", "Fira Code", monospace', color: C.text, display: 'flex', flexDirection: 'column' }}>
      
      {/* Global CSS Reset */}
      <style>{`
        * { box-sizing: border-box; } 
        body { margin: 0; background: ${C.bg}; } 
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } } 
        ::-webkit-scrollbar { width: 6px; } 
        ::-webkit-scrollbar-track { background: ${C.bg}; } 
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; } 
        input::placeholder { color: ${C.muted}; }
      `}</style>
      
      {/* Top Navigation Bar */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', height: 56, background: C.surface, borderBottom: `1px solid ${C.border}`, flexShrink: 0, position: 'sticky', top: 0, zIndex: 100 }}>
        <span style={{ color: C.cyan, fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em' }}>
          AdaptiveAI
        </span>
        
        {/* Tab Buttons */}
        <div style={{ display: 'flex', gap: 4 }}>
          {[['dashboard', 'Dashboard'], ['alerts', 'Alerts'], ['graph', 'Graph Explorer']].map(([id, label]) => (
            <button 
              key={id} 
              onClick={() => setPage(id)} 
              style={{ 
                background: 'none', border: 'none', cursor: 'pointer', padding: '6px 16px', borderRadius: 6, fontSize: 14, fontWeight: 500, 
                color: page === id ? C.text : C.muted, 
                borderBottom: page === id ? `2px solid ${C.cyan}` : '2px solid transparent', 
                transition: 'all 0.15s' 
              }}>
              {label}
            </button>
          ))}
        </div>
        
        {/* Live Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: C.muted }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.green, boxShadow: `0 0 5px ${C.green}`, display: 'inline-block', animation: 'pulse 2s infinite' }} /> 
          LIVE
        </div>
      </nav>

      {/* Page Renderer */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {page === 'dashboard' && <Dashboard stats={stats} flagRate={flagRate} decisions={decisions} />}
        {page === 'alerts'    && <Alerts alerts={alerts} />}
        {page === 'graph'     && <GraphExplorer graphData={graphData} />}
      </div>

    </div>
  );
}