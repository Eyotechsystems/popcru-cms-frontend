import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, ChevronRight, Gavel, Search } from 'lucide-react';
import { api } from '../lib/api';
import Layout from '../components/Layout';
import StatusBadge, { STATUS_COLOR } from '../components/StatusBadge';
import FlameMark from '../components/FlameMark';

const CountUp = ({ value, duration = 700 }) => {
  const [display, setDisplay] = useState(0);
  const startRef = useRef(null);
  useEffect(() => {
    startRef.current = null;
    let raf;
    const step = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const progress = Math.min((ts - startRef.current) / duration, 1);
      setDisplay(Math.round((1 - Math.pow(1 - progress, 3)) * value));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{display}</>;
};

const isClosed = (s) => s === 'resolved' || s === 'withdrawn';

export default function AttorneyDashboard() {
  const navigate = useNavigate();
  const [cases, setCases] = useState(null);
  const [filter, setFilter] = useState('all'); // all | active | closed
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/attorney/my-cases').then(setCases).catch(() => setCases([]));
  }, []);

  const list = cases || [];
  const activeCount = list.filter((c) => !isClosed(c.status)).length;
  const closedCount = list.filter((c) => isClosed(c.status)).length;

  const visible = list.filter((c) => {
    if (filter === 'active' && isClosed(c.status)) return false;
    if (filter === 'closed' && !isClosed(c.status)) return false;
    if (search && !`${c.case_reference} ${c.member_name} ${c.type_of_matter}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const chips = [
    { key: 'all', label: 'Total assigned', value: list.length },
    { key: 'active', label: 'Active', value: activeCount },
    { key: 'closed', label: 'Closed', value: closedCount },
  ];

  return (
    <Layout>
      <style>{`
        @keyframes cardIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .att-card { transition: transform 0.15s ease, box-shadow 0.15s ease; animation: cardIn 0.4s cubic-bezier(0.16,1,0.3,1) both; }
        .att-card:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(20,17,15,0.10); }
        .att-chip { transition: transform 0.18s ease, box-shadow 0.18s ease; }
        .att-chip:hover { transform: translateY(-2px); }
      `}</style>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Gavel size={22} className="text-ember" /> Assigned Cases
          </h1>
          <p className="text-sm text-slate mt-0.5">Matters currently assigned to you</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-white border border-slate-light">
          <Search size={14} className="text-slate" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..."
            className="bg-transparent outline-none text-sm w-40" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {chips.map((c) => (
          <button key={c.key} onClick={() => setFilter(c.key)}
            className="att-chip text-left p-4 rounded-xl bg-white"
            style={{
              borderTop: `3px solid ${filter === c.key ? '#C4321F' : '#E4DFD3'}`,
              boxShadow: filter === c.key ? '0 4px 14px rgba(20,17,15,0.08)' : '0 1px 3px rgba(0,0,0,0.04)',
            }}>
            <p className="text-xs text-slate mb-1">{c.label}</p>
            <span className="font-display text-3xl font-bold"><CountUp value={c.value} /></span>
          </button>
        ))}
      </div>

      {cases === null && <p className="text-sm text-slate">Loading…</p>}
      {cases !== null && visible.length === 0 && (
        <div className="bg-white rounded-xl p-10 text-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <Gavel size={28} className="text-slate-light mx-auto mb-3" />
          <p className="text-sm text-slate">
            {list.length === 0 ? 'No cases are currently assigned to you.' : 'No cases match this filter.'}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {visible.map((c, i) => (
          <button key={c.id} onClick={() => navigate(`/cases/${c.id}`)}
            className="att-card relative text-left bg-white rounded-xl p-4 pl-5 overflow-hidden"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)', animationDelay: `${i * 50}ms` }}>
            <span className="absolute left-0 top-0 bottom-0 w-1" style={{ background: STATUS_COLOR[c.status] || '#6B655C' }} />
            <div className="flex items-start justify-between mb-2">
              <p className="font-mono text-xs text-slate flex items-center gap-1.5">{c.priority && <FlameMark priority={c.priority} size={14} />}{c.case_reference}</p>
              <StatusBadge status={c.status} />
            </div>
            <p className="font-display font-semibold">{c.member_name}</p>
            <p className="text-sm text-slate mt-0.5">{c.type_of_matter}</p>
            <div className="flex items-center justify-between mt-3">
              <span className="flex items-center gap-1 text-xs text-slate"><MapPin size={11} />{c.province}</span>
              <ChevronRight size={15} className="text-slate" />
            </div>
          </button>
        ))}
      </div>
    </Layout>
  );
}
