import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, GripVertical, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api';
import Layout from '../components/Layout';
import FlameMark from '../components/FlameMark';

const INK = '#14110F';
const GOLD = '#E8B32D';
const SLATE = '#6B655C';
const SLATE_LIGHT = '#E4DFD3';
const GREEN = '#4B7A51';

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

// A case only reaches a Practitioner once it has been allocated (which
// sets it to Ongoing), so there is no "New" column here. Moving a card
// into Referred through the board only changes the status — escalating
// to a specific attorney is done from the case itself.
const COLUMNS = [
  { key: 'ongoing', label: 'Ongoing', accent: GOLD },
  { key: 'referred_external', label: 'Referred', accent: SLATE },
  { key: 'resolved', label: 'Resolved', accent: GREEN },
  { key: 'withdrawn', label: 'Withdrawn', accent: SLATE_LIGHT },
];

export default function PractitionerDashboard() {
  const navigate = useNavigate();
  const [cases, setCases] = useState(null);
  const [search, setSearch] = useState('');
  const [dragCard, setDragCard] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const load = useCallback(() => {
    api.get('/cases?limit=100').then((d) => setCases(d.cases)).catch(() => setCases([]));
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = (cases || []).filter((c) =>
    !search || `${c.case_reference} ${c.member_name} ${c.type_of_matter}`.toLowerCase().includes(search.toLowerCase())
  );
  const grouped = COLUMNS.reduce((acc, col) => {
    acc[col.key] = filtered.filter((c) => c.status === col.key);
    return acc;
  }, {});
  const total = (cases || []).length;
  const resolvedCount = (cases || []).filter((c) => c.status === 'resolved').length;

  const onDrop = async (columnKey) => {
    if (!dragCard) return;
    const { card, from } = dragCard;
    setDragCard(null);
    if (from === columnKey) return;
    try {
      await api.put(`/cases/${card.id}/status`, { status: columnKey });
      showToast(`${card.case_reference} moved to ${COLUMNS.find((c) => c.key === columnKey).label}`);
      load();
    } catch (err) {
      showToast(err.body?.error || 'Could not update the case.');
    }
  };

  return (
    <Layout>
      <style>{`
        @keyframes flamePulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.65; transform: scale(1.12); } }
        .flame-pulse { animation: flamePulse 1.6s ease-in-out infinite; }
        .kanban-card { transition: transform 0.15s ease, box-shadow 0.15s ease; cursor: grab; }
        .kanban-card:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(20,17,15,0.12); }
        .kanban-card:active { cursor: grabbing; }
        .toast-enter { animation: toastIn 0.25s cubic-bezier(0.16,1,0.3,1); }
        @keyframes toastIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">My Cases</h1>
          <p className="text-sm text-slate mt-0.5">
            <CountUp value={total} /> case{total === 1 ? '' : 's'} allocated to you
            {resolvedCount > 0 && <span> · <CountUp value={resolvedCount} /> resolved</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-white border border-slate-light">
          <Search size={14} className="text-slate" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..."
            className="bg-transparent outline-none text-sm w-40" />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {COLUMNS.map((col) => (
          <div key={col.key} className="rounded-xl p-2.5" style={{ background: 'rgba(20,17,15,0.025)', minHeight: 300 }}
            onDragOver={(e) => e.preventDefault()} onDrop={() => onDrop(col.key)}>
            <div className="flex items-center justify-between px-1.5 py-1.5 mb-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: col.accent }} />
                {col.label}
              </span>
              <span className="text-xs font-semibold text-slate">{cases === null ? '…' : grouped[col.key].length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {cases === null && <p className="text-xs text-slate text-center py-6">Loading…</p>}
              {cases !== null && grouped[col.key].map((card) => (
                <div key={card.id} draggable
                  onDragStart={() => setDragCard({ card, from: col.key })}
                  onClick={() => navigate(`/cases/${card.id}`)}
                  className="kanban-card p-3 rounded-lg bg-white" style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                  <div className="flex items-start justify-between mb-1.5">
                    <FlameMark priority={card.priority} />
                    <GripVertical size={12} color={SLATE_LIGHT} />
                  </div>
                  <p className="text-xs font-mono mb-1 text-slate">{card.case_reference}</p>
                  <p className="text-sm font-medium mb-1">{card.member_name}</p>
                  <p className="text-xs mb-2 text-slate">{card.type_of_matter}</p>
                  <span className="flex items-center gap-1 text-xs text-slate"><MapPin size={10} />{card.province}</span>
                </div>
              ))}
              {cases !== null && grouped[col.key].length === 0 && (
                <div className="text-xs text-center py-6 rounded-lg text-slate-light" style={{ border: `1.5px dashed ${SLATE_LIGHT}` }}>
                  {total === 0 ? 'Nothing allocated yet' : 'Drop here'}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {toast && (
        <div className="toast-enter fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-full flex items-center gap-2 text-sm text-white"
          style={{ background: INK, boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}>
          <CheckCircle2 size={14} color={GOLD} />
          {toast}
        </div>
      )}
    </Layout>
  );
}
