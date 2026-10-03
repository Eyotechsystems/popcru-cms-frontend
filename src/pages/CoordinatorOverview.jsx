import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Flame, Search, Plus, Clock, CheckCircle2, AlertTriangle, ArrowUpRight,
  Users, MapPin, GripVertical, TrendingUp, X,
} from 'lucide-react';
import { api } from '../lib/api';
import Layout from '../components/Layout';
import NewCaseModal from '../components/NewCaseModal';

const INK = '#14110F';
const EMBER = '#C4321F';
const GOLD = '#E8B32D';
const SLATE = '#6B655C';
const SLATE_LIGHT = '#E4DFD3';
const GREEN = '#4B7A51';

const PRIORITY_COLOR = { critical: EMBER, high: EMBER, medium: GOLD, low: SLATE };
const FlameMark = ({ priority, size = 15 }) => {
  const p = priority?.toLowerCase();
  const color = PRIORITY_COLOR[p] || SLATE;
  const pulse = p === 'critical';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={pulse ? 'flame-pulse' : ''}>
      <path d="M12 2c1 3-2 4-2 7a4 4 0 0 0 8 0c0-1.5-1-2.5-1.5-3.5.8.3 3.5 2 3.5 6.5a8 8 0 1 1-16 0C4 7 8 5 12 2Z"
        fill={color} fillOpacity={0.55} stroke={color} strokeWidth="1.5" />
    </svg>
  );
};

const CountUp = ({ value, duration = 700 }) => {
  const [display, setDisplay] = useState(0);
  const startRef = useRef(null);
  useEffect(() => {
    startRef.current = null;
    let raf;
    const step = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const progress = Math.min((ts - startRef.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{display}</>;
};

const Sparkline = ({ data, color }) => {
  if (!data || data.length < 2) return <div style={{ width: 64, height: 24 }} />;
  const w = 64, h = 24;
  const max = Math.max(...data), min = Math.min(...data);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / (max - min || 1)) * h;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const Gauge = ({ value, max, size = 52 }) => {
  const pct = Math.min(value / Math.max(max, 1), 1);
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const over = value >= max;
  const color = over ? EMBER : pct > 0.75 ? GOLD : GREEN;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={SLATE_LIGHT} strokeWidth="5" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={circ - pct * circ}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)' }} />
      <text x="50%" y="53%" textAnchor="middle" dominantBaseline="middle" fontSize="13" fontWeight="700" fill={INK}>{value}</text>
    </svg>
  );
};

const COLUMNS = [
  { key: 'new', label: 'New', accent: EMBER },
  { key: 'ongoing', label: 'Ongoing', accent: GOLD },
  { key: 'referred_external', label: 'Referred', accent: SLATE },
  { key: 'resolved', label: 'Resolved', accent: GREEN },
];

const ACTION_LABEL = {
  'case.create': 'New case registered',
  'case.allocate': 'Case allocated',
  'case.reallocate': 'Case reallocated',
  'case.status_change': 'Status updated',
  'case.attorney_assign': 'Attorney assigned',
  'case.note_add': 'Note added',
  'case.court_update': 'Court update recorded',
  'case.message': 'Message sent',
  'document.upload': 'Document uploaded',
  'document.delete': 'Document removed',
  'invoice.submit': 'Invoice submitted',
  'invoice.approve': 'Invoice approved',
  'appointment.create': 'Appointment scheduled',
  'appointment.delete': 'Appointment cancelled',
};

const timeAgo = (iso) => {
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
};

const initials = (name) => (name || '?').split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();

export default function CoordinatorOverview() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [monthly, setMonthly] = useState([]);
  const [activity, setActivity] = useState(null);
  const [cases, setCases] = useState(null);
  const [practitioners, setPractitioners] = useState([]);
  const [showNewCase, setShowNewCase] = useState(false);
  const [dragCard, setDragCard] = useState(null);
  const [pendingAllocation, setPendingAllocation] = useState(null); // { card }
  const [toast, setToast] = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const load = useCallback(() => {
    api.get('/dashboard/stats').then(setStats).catch(() => {});
    api.get('/dashboard/activity').then(setActivity).catch(() => setActivity([]));
    api.get('/reports/cases-by-month').then((d) => setMonthly([...d].reverse())).catch(() => setMonthly([]));
    api.get('/cases?limit=100').then((d) => setCases(d.cases)).catch(() => setCases([]));
    api.get('/users/practitioners').then(setPractitioners).catch(() => setPractitioners([]));
  }, []);

  useEffect(() => { load(); }, [load]);

  const grouped = COLUMNS.reduce((acc, col) => {
    acc[col.key] = (cases || []).filter((c) => c.status === col.key);
    return acc;
  }, {});

  const workloadAlerts = (stats?.practitionerWorkload || []).filter((w) => Number(w.active_cases) >= Number(w.max_case_load)).length;
  const monthlyTrend = monthly.map((m) => Number(m.count));

  const onDrop = async (columnKey) => {
    if (!dragCard) return;
    const { card, from } = dragCard;
    setDragCard(null);
    if (from === columnKey) return;

    // Moving an unallocated case into Ongoing requires picking a
    // practitioner — everything else is a plain status change.
    if (columnKey === 'ongoing' && from === 'new') {
      setPendingAllocation({ card });
      return;
    }
    try {
      await api.put(`/cases/${card.id}/status`, { status: columnKey });
      showToast(`${card.case_reference} moved to ${COLUMNS.find((c) => c.key === columnKey).label}`);
      load();
    } catch (err) {
      showToast(err.body?.error || 'Error updating case status.');
    }
  };

  return (
    <Layout>
      <style>{`
        @keyframes flamePulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.65; transform: scale(1.12); } }
        .flame-pulse { animation: flamePulse 1.6s ease-in-out infinite; }
        .kpi-card { transition: transform 0.18s ease, box-shadow 0.18s ease; }
        .kpi-card:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(20,17,15,0.10); }
        .kanban-card { transition: transform 0.15s ease, box-shadow 0.15s ease; cursor: grab; }
        .kanban-card:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(20,17,15,0.12); }
        .kanban-card:active { cursor: grabbing; }
        .toast-enter { animation: toastIn 0.25s cubic-bezier(0.16,1,0.3,1); }
        @keyframes toastIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .feed-item:hover { background: rgba(20,17,15,0.03); }
      `}</style>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Overview</h1>
          <p className="text-sm text-slate mt-0.5">
            {new Date().toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button onClick={() => setShowNewCase(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold text-white bg-ember">
          <Plus size={16} /> New Case
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="kpi-card p-4 rounded-xl bg-white" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <p className="text-xs mb-2 text-slate">Total cases</p>
          <div className="flex items-end justify-between">
            <span className="font-display text-3xl font-bold"><CountUp value={Number(stats?.totals?.total || 0)} /></span>
            <Sparkline data={monthlyTrend} color={EMBER} />
          </div>
        </div>
        <div className="kpi-card p-4 rounded-xl bg-white" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <p className="text-xs mb-2 text-slate">Ongoing</p>
          <span className="font-display text-3xl font-bold"><CountUp value={Number(stats?.totals?.ongoing || 0)} /></span>
        </div>
        <div className="kpi-card p-4 rounded-xl bg-white" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <p className="text-xs mb-2 text-slate">Resolved</p>
          <span className="font-display text-3xl font-bold"><CountUp value={Number(stats?.totals?.resolved || 0)} /></span>
        </div>
        <div className="kpi-card p-4 rounded-xl bg-white" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <p className="text-xs mb-2 text-slate">Workload alerts</p>
          <div className="flex items-center gap-1.5">
            <span className="font-display text-3xl font-bold" style={{ color: workloadAlerts > 0 ? EMBER : INK }}>
              <CountUp value={workloadAlerts} />
            </span>
            {workloadAlerts > 0 && <AlertTriangle size={16} color={EMBER} />}
          </div>
        </div>
      </div>

      <div className="grid gap-5" style={{ gridTemplateColumns: '1fr 300px' }}>
        {/* Kanban board */}
        <div className="grid grid-cols-4 gap-3">
          {COLUMNS.map((col) => (
            <div key={col.key} className="rounded-xl p-2.5" style={{ background: 'rgba(20,17,15,0.025)', minHeight: 200 }}
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
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-xs text-slate"><MapPin size={10} />{card.province}</span>
                      {card.practitioner_name && (
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ background: INK }}>
                          {initials(card.practitioner_name)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {cases !== null && grouped[col.key].length === 0 && (
                  <div className="text-xs text-center py-6 rounded-lg text-slate-light" style={{ border: `1.5px dashed ${SLATE_LIGHT}` }}>Drop here</div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          <div className="p-4 rounded-xl bg-white" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <h3 className="font-display text-sm font-semibold mb-3 flex items-center gap-1.5"><Users size={14} color={EMBER} /> Practitioner load</h3>
            <div className="flex flex-col gap-3">
              {(stats?.practitionerWorkload || []).map((p) => (
                <div key={p.id} className="flex items-center gap-3">
                  <Gauge value={Number(p.active_cases)} max={Number(p.max_case_load)} />
                  <div>
                    <p className="text-sm font-medium">{p.practitioner}</p>
                    <p className="text-xs text-slate">{p.active_cases} / {p.max_case_load} active cases</p>
                  </div>
                </div>
              ))}
              {stats && stats.practitionerWorkload?.length === 0 && <p className="text-xs text-slate">No practitioners yet.</p>}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <h3 className="font-display text-sm font-semibold mb-1 flex items-center gap-1.5"><TrendingUp size={14} color={EMBER} /> Live activity</h3>
            <div className="flex flex-col mt-2">
              {activity === null && <p className="text-xs text-slate py-4">Loading…</p>}
              {activity?.length === 0 && <p className="text-xs text-slate py-4">No recent activity.</p>}
              {activity?.map((item) => (
                <div key={item.id} className="feed-item flex items-start gap-2 py-2 px-1.5 rounded-lg">
                  <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: SLATE_LIGHT }} />
                  <div>
                    <p className="text-xs leading-snug">
                      {ACTION_LABEL[item.action] || item.action}
                      {item.case_reference && <span className="text-slate"> · {item.case_reference}</span>}
                    </p>
                    <p className="text-[11px] mt-0.5 text-slate">{item.actor_name || 'System'} · {timeAgo(item.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showNewCase && <NewCaseModal onClose={() => setShowNewCase(false)} onCreated={() => { setShowNewCase(false); load(); }} />}

      {pendingAllocation && (
        <AllocateOnDropModal
          card={pendingAllocation.card}
          practitioners={practitioners}
          onClose={() => setPendingAllocation(null)}
          onDone={(msg) => { setPendingAllocation(null); showToast(msg); load(); }}
        />
      )}

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

function AllocateOnDropModal({ card, practitioners, onClose, onDone }) {
  const [practitionerId, setPractitionerId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const confirm = async () => {
    if (!practitionerId) return;
    setBusy(true);
    setError('');
    try {
      const result = await api.put(`/cases/${card.id}/allocate`, { practitioner_id: practitionerId });
      onDone(result.workloadWarning || `${card.case_reference} allocated`);
    } catch (err) {
      setError(err.body?.error || 'Error allocating case.');
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-ink/50 px-4" onClick={onClose}>
      <div className="bg-white rounded-lg p-5 w-full max-w-sm border-t-4 border-ember" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold">Allocate {card.case_reference}</h3>
          <button onClick={onClose}><X size={16} className="text-slate" /></button>
        </div>
        <p className="text-sm text-slate mb-3">Moving this to Ongoing requires a practitioner.</p>
        <select value={practitionerId} onChange={(e) => setPractitionerId(e.target.value)}
          className="w-full px-3 py-2 rounded text-sm border border-slate-light outline-none focus:border-ember mb-3">
          <option value="">Select practitioner...</option>
          {practitioners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {error && <p className="text-xs text-ember mb-2">{error}</p>}
        <button onClick={confirm} disabled={!practitionerId || busy}
          className="w-full py-2 rounded text-sm font-semibold text-white bg-ember disabled:bg-slate-light disabled:text-slate">
          {busy ? 'Allocating…' : 'Allocate'}
        </button>
      </div>
    </div>
  );
}
