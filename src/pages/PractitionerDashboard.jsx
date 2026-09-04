import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, ChevronRight, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api';
import Layout from '../components/Layout';
import FlameMark from '../components/FlameMark';
import StatusBadge from '../components/StatusBadge';

export default function PractitionerDashboard() {
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statFilter, setStatFilter] = useState(null);
  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    // The backend auto-scopes this to the logged-in practitioner's
    // own allocated cases — no client-side filtering needed for that part.
    api.get('/cases?limit=100').then((data) => setCases(data.cases)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const counts = {
    new: cases.filter((c) => c.status === 'new').length,
    ongoing: cases.filter((c) => c.status === 'ongoing').length,
    resolved: cases.filter((c) => c.status === 'resolved').length,
  };

  const filtered = cases.filter((c) => {
    if (statFilter && c.status !== statFilter) return false;
    if (search && !`${c.case_reference} ${c.member_name} ${c.type_of_matter}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const statCards = [
    { key: 'new', label: 'New', value: counts.new, icon: AlertTriangle },
    { key: 'ongoing', label: 'Ongoing', value: counts.ongoing, icon: Clock },
    { key: 'resolved', label: 'Resolved', value: counts.resolved, icon: CheckCircle2 },
  ];

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">My Cases</h1>
        <p className="text-sm text-slate mt-0.5">{cases.length} case{cases.length === 1 ? '' : 's'} allocated to you</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-7">
        {statCards.map((s) => (
          <button
            key={s.key}
            onClick={() => setStatFilter(statFilter === s.key ? null : s.key)}
            className="text-left p-4 rounded-lg bg-white transition-transform"
            style={{
              borderTop: `3px solid ${statFilter === s.key ? '#C4321F' : '#E4DFD3'}`,
              boxShadow: statFilter === s.key ? '0 2px 10px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <s.icon size={16} className="text-slate mb-3" />
            <div className="font-display text-2xl font-bold">{s.value}</div>
            <div className="text-xs mt-1 text-slate">{s.label}</div>
          </button>
        ))}
      </div>

      <div className="rounded-lg overflow-hidden bg-white" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-light">
          <h3 className="font-display text-sm font-semibold">
            Cases {statFilter && <span className="text-ember">· filtered</span>}
          </h3>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-paper">
            <Search size={14} className="text-slate" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..."
              className="bg-transparent outline-none text-sm w-40" />
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase text-slate">
              <th className="text-left font-medium px-5 py-2">Priority</th>
              <th className="text-left font-medium px-2 py-2">Reference</th>
              <th className="text-left font-medium px-2 py-2">Member</th>
              <th className="text-left font-medium px-2 py-2">Matter</th>
              <th className="text-left font-medium px-2 py-2">Province</th>
              <th className="text-left font-medium px-2 py-2">Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="text-center py-8 text-sm text-slate">Loading…</td></tr>}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-sm text-slate">
                {cases.length === 0 ? 'No cases allocated to you yet.' : 'No cases match this filter.'}
              </td></tr>
            )}
            {!loading && filtered.map((c) => (
              <tr key={c.id} onClick={() => navigate(`/cases/${c.id}`)} className="cursor-pointer border-t border-slate-light hover:bg-paper">
                <td className="px-5 py-3"><FlameMark priority={c.priority} /></td>
                <td className="px-2 py-3 font-mono text-xs">{c.case_reference}</td>
                <td className="px-2 py-3 font-medium">{c.member_name}</td>
                <td className="px-2 py-3 text-slate">{c.type_of_matter}</td>
                <td className="px-2 py-3 text-slate"><span className="flex items-center gap-1"><MapPin size={11} />{c.province}</span></td>
                <td className="px-2 py-3"><StatusBadge status={c.status} /></td>
                <td className="px-2 py-3 text-right pr-4"><ChevronRight size={15} className="text-slate" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
