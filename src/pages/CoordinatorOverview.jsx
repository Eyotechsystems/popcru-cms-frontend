import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, MapPin, ChevronRight, Clock, AlertTriangle, CheckCircle2, Users, ArrowUpRight,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, AreaChart, Area, CartesianGrid,
} from 'recharts';
import { api } from '../lib/api';
import Layout from '../components/Layout';
import FlameMark from '../components/FlameMark';
import StatusBadge from '../components/StatusBadge';
import NewCaseModal from '../components/NewCaseModal';
import CaseDetailPanel from '../components/CaseDetailPanel';

export default function CoordinatorOverview() {
  const [stats, setStats] = useState(null);
  const [provinceData, setProvinceData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [statFilter, setStatFilter] = useState(null);
  const [search, setSearch] = useState('');
  const [showNewCase, setShowNewCase] = useState(false);
  const [selected, setSelected] = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [statsRes, provinceRes, monthRes, casesRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/reports/cases-by-province'),
        api.get('/reports/cases-by-month'),
        api.get('/cases?limit=50'),
      ]);
      setStats(statsRes);
      setProvinceData(provinceRes.map((r) => ({ province: r.province, cases: Number(r.count) })));
      setTrendData(
        monthRes
          .slice()
          .reverse()
          .map((r) => ({ month: r.month, cases: Number(r.count) }))
      );
      setCases(casesRes.cases);
    } catch (err) {
      setLoadError(err.body?.error || 'Error loading dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const filtered = cases.filter((c) => {
    if (statFilter === 'unallocated' && c.practitioner_name) return false;
    if (statFilter && statFilter !== 'unallocated' && c.status !== statFilter) return false;
    if (search && !`${c.case_reference} ${c.member_name} ${c.type_of_matter}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const unallocatedCount = cases.filter((c) => !c.practitioner_name).length;

  const handleAllocated = (caseId, practitionerName) => {
    setCases((prev) => prev.map((c) => (c.id === caseId ? { ...c, practitioner_name: practitionerName, status: 'ongoing' } : c)));
    setSelected(null);
  };

  const handleCreated = (newCase) => {
    setShowNewCase(false);
    loadAll(); // simplest correct way to reflect updated stats/charts too
  };

  if (loading) {
    return (
      <Layout>
        <p className="text-sm text-slate">Loading dashboard…</p>
      </Layout>
    );
  }

  if (loadError) {
    return (
      <Layout>
        <p className="text-sm text-ember bg-ember/5 border border-ember/20 rounded px-4 py-3 inline-block">
          {loadError}
        </p>
      </Layout>
    );
  }

  const statCards = [
    { key: 'new', label: 'New Cases', value: Number(stats.totals.new_cases || 0), icon: AlertTriangle },
    { key: 'ongoing', label: 'Ongoing', value: Number(stats.totals.ongoing || 0), icon: Clock },
    { key: 'resolved', label: 'Resolved', value: Number(stats.totals.resolved || 0), icon: CheckCircle2 },
    { key: 'unallocated', label: 'Awaiting Allocation', value: unallocatedCount, icon: Users },
  ];

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Overview</h1>
          <p className="text-sm text-slate mt-0.5">
            {new Date().toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button
          onClick={() => setShowNewCase(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded text-sm font-semibold text-white bg-ember"
        >
          <Plus size={16} /> New Case
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-7">
        {statCards.map((s) => (
          <button
            key={s.key}
            onClick={() => setStatFilter(statFilter === s.key ? null : s.key)}
            className="text-left p-4 rounded-lg bg-white transition-transform"
            style={{
              borderTop: `3px solid ${statFilter === s.key ? '#C4321F' : '#E4DFD3'}`,
              boxShadow: statFilter === s.key ? '0 2px 10px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.04)',
              transform: statFilter === s.key ? 'translateY(-2px)' : 'none',
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <s.icon size={16} className="text-slate" />
              {statFilter === s.key && <ArrowUpRight size={14} className="text-ember" />}
            </div>
            <div className="font-display text-2xl font-bold">{s.value}</div>
            <div className="text-xs mt-1 text-slate">{s.label}</div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-7">
        <div className="p-5 rounded-lg bg-white" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <h3 className="font-display text-sm font-semibold mb-4">Cases registered — last 12 months</h3>
          {trendData.length === 0 ? (
            <p className="text-xs text-slate py-8 text-center">No case history yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="emberFade" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#C4321F" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#C4321F" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#E4DFD3" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6B655C' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #E4DFD3' }} />
                <Area type="monotone" dataKey="cases" stroke="#C4321F" strokeWidth={2} fill="url(#emberFade)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="p-5 rounded-lg bg-white" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <h3 className="font-display text-sm font-semibold mb-4">Active cases by province</h3>
          {provinceData.length === 0 ? (
            <p className="text-xs text-slate py-8 text-center">No cases yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={provinceData}>
                <CartesianGrid vertical={false} stroke="#E4DFD3" />
                <XAxis dataKey="province" tick={{ fontSize: 10, fill: '#6B655C' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #E4DFD3' }} />
                <Bar dataKey="cases" fill="#E8B32D" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="rounded-lg overflow-hidden bg-white" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-light">
          <h3 className="font-display text-sm font-semibold">
            Cases {statFilter && <span className="text-ember">· filtered</span>}
          </h3>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-paper">
            <Search size={14} className="text-slate" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search cases..."
              className="bg-transparent outline-none text-sm w-40"
            />
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
              <th className="text-left font-medium px-2 py-2">Practitioner</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} onClick={() => setSelected(c)} className="cursor-pointer border-t border-slate-light">
                <td className="px-5 py-3"><FlameMark priority={c.priority} /></td>
                <td className="px-2 py-3 font-mono text-xs">{c.case_reference}</td>
                <td className="px-2 py-3 font-medium">{c.member_name}</td>
                <td className="px-2 py-3 text-slate">{c.type_of_matter}</td>
                <td className="px-2 py-3 text-slate">
                  <span className="flex items-center gap-1"><MapPin size={11} />{c.province}</span>
                </td>
                <td className="px-2 py-3"><StatusBadge status={c.status} /></td>
                <td className="px-2 py-3" style={{ color: c.practitioner_name ? '#14110F' : '#6B655C' }}>
                  {c.practitioner_name || 'Unallocated'}
                </td>
                <td className="px-2 py-3 text-right pr-4"><ChevronRight size={15} className="text-slate" /></td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="text-center py-8 text-sm text-slate">No cases match this filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showNewCase && (
        <NewCaseModal onClose={() => setShowNewCase(false)} onCreated={handleCreated} />
      )}
      {selected && (
        <CaseDetailPanel caseSummary={selected} onClose={() => setSelected(null)} onAllocated={handleAllocated} />
      )}
    </Layout>
  );
}
