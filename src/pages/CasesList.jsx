import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, MapPin, ChevronRight, ChevronLeft } from 'lucide-react';
import { api } from '../lib/api';
import Layout from '../components/Layout';
import FlameMark from '../components/FlameMark';
import StatusBadge from '../components/StatusBadge';
import NewCaseModal from '../components/NewCaseModal';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'new', label: 'New' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'referred_external', label: 'Referred' },
  { value: 'withdrawn', label: 'Withdrawn' },
];

export default function CasesList() {
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNewCase, setShowNewCase] = useState(false);
  const limit = 20;

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit });
    if (status) params.set('status', status);
    if (search) params.set('search', search);
    api.get(`/cases?${params.toString()}`)
      .then((data) => { setCases(data.cases); setTotal(data.total); })
      .finally(() => setLoading(false));
  }, [page, status, search]);

  useEffect(() => { load(); }, [load]);

  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">All Cases</h1>
          <p className="text-sm text-slate mt-0.5">{total} case{total === 1 ? '' : 's'} total</p>
        </div>
        <button onClick={() => setShowNewCase(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded text-sm font-semibold text-white bg-ember">
          <Plus size={16} /> New Case
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2 px-3 py-2 rounded bg-white border border-slate-light flex-1 max-w-xs">
          <Search size={14} className="text-slate" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search reference, member, matter..."
            className="bg-transparent outline-none text-sm w-full"
          />
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded text-sm border border-slate-light outline-none bg-white"
        >
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div className="rounded-lg overflow-hidden bg-white" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
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
            {loading && <tr><td colSpan={8} className="text-center py-8 text-sm text-slate">Loading…</td></tr>}
            {!loading && cases.length === 0 && (
              <tr><td colSpan={8} className="text-center py-8 text-sm text-slate">No cases match this filter.</td></tr>
            )}
            {!loading && cases.map((c) => (
              <tr key={c.id} onClick={() => navigate(`/cases/${c.id}`)} className="cursor-pointer border-t border-slate-light hover:bg-paper">
                <td className="px-5 py-3"><FlameMark priority={c.priority} /></td>
                <td className="px-2 py-3 font-mono text-xs">{c.case_reference}</td>
                <td className="px-2 py-3 font-medium">{c.member_name}</td>
                <td className="px-2 py-3 text-slate">{c.type_of_matter}</td>
                <td className="px-2 py-3 text-slate"><span className="flex items-center gap-1"><MapPin size={11} />{c.province}</span></td>
                <td className="px-2 py-3"><StatusBadge status={c.status} /></td>
                <td className="px-2 py-3" style={{ color: c.practitioner_name ? '#14110F' : '#6B655C' }}>
                  {c.practitioner_name || 'Unallocated'}
                </td>
                <td className="px-2 py-3 text-right pr-4"><ChevronRight size={15} className="text-slate" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="p-1.5 rounded border border-slate-light disabled:opacity-40">
            <ChevronLeft size={15} />
          </button>
          <span className="text-sm text-slate">Page {page} of {pages}</span>
          <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}
            className="p-1.5 rounded border border-slate-light disabled:opacity-40">
            <ChevronRight size={15} />
          </button>
        </div>
      )}

      {showNewCase && (
        <NewCaseModal onClose={() => setShowNewCase(false)} onCreated={() => { setShowNewCase(false); load(); }} />
      )}
    </Layout>
  );
}
