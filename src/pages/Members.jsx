import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, X, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';

const PROVINCES = ['Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape', 'Western Cape'];

export default function Members() {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [province, setProvince] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState(null);

  const canRegister = ['coordinator', 'system_admin'].includes(user?.role);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: 50 });
    if (search) params.set('search', search);
    if (province) params.set('province', province);
    api.get(`/members?${params.toString()}`).then(setMembers).finally(() => setLoading(false));
  }, [search, province]);

  useEffect(() => { load(); }, [load]);

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Members</h1>
          <p className="text-sm text-slate mt-0.5">{members.length} shown</p>
        </div>
        {canRegister && (
          <button onClick={() => setShowNew(true)} className="flex items-center gap-2 px-4 py-2.5 rounded text-sm font-semibold text-white bg-ember">
            <Plus size={16} /> Register Member
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2 px-3 py-2 rounded bg-white border border-slate-light flex-1 max-w-xs">
          <Search size={14} className="text-slate" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, membership no, email..."
            className="bg-transparent outline-none text-sm w-full" />
        </div>
        <select value={province} onChange={(e) => setProvince(e.target.value)} className="px-3 py-2 rounded text-sm border border-slate-light bg-white">
          <option value="">All provinces</option>
          {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div className="rounded-lg overflow-hidden bg-white" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase text-slate">
              <th className="text-left font-medium px-5 py-2">Membership No.</th>
              <th className="text-left font-medium px-2 py-2">Name</th>
              <th className="text-left font-medium px-2 py-2">Department</th>
              <th className="text-left font-medium px-2 py-2">Province</th>
              <th className="text-left font-medium px-2 py-2">Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="text-center py-8 text-sm text-slate">Loading…</td></tr>}
            {!loading && members.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-sm text-slate">No members found.</td></tr>}
            {!loading && members.map((m) => (
              <tr key={m.id} onClick={() => setSelected(m)} className="cursor-pointer border-t border-slate-light hover:bg-paper">
                <td className="px-5 py-3 font-mono text-xs">{m.membership_number}</td>
                <td className="px-2 py-3 font-medium">{m.first_name} {m.last_name}</td>
                <td className="px-2 py-3 text-slate">{m.department || '—'}</td>
                <td className="px-2 py-3 text-slate">{m.province || '—'}</td>
                <td className="px-2 py-3">
                  {m.pending_verification
                    ? <span className="px-2 py-0.5 rounded text-xs font-medium bg-gold/10 text-ink">Pending verification</span>
                    : <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-700/10 text-green-700">Verified</span>}
                </td>
                <td></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showNew && <RegisterMemberModal onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); load(); }} />}
      {selected && <MemberDetailPanel member={selected} onClose={() => setSelected(null)} canVerify={canRegister} onVerified={load} />}
    </Layout>
  );
}

function RegisterMemberModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    membership_number: '', first_name: '', last_name: '', email: '', phone: '',
    department: '', province: '', shop_steward_name: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.post('/members', form);
      onCreated();
    } catch (err) {
      setError(err.body?.error || 'Error registering member.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-ink/50 px-4" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 w-full max-w-md border-t-4 border-ember max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-lg">Register Member Manually</h3>
          <button onClick={onClose}><X size={18} className="text-slate" /></button>
        </div>
        <p className="text-xs text-slate bg-paper rounded px-3 py-2 mb-4">
          Use this only when the membership database is unavailable. The record is flagged for later verification.
        </p>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <input value={form.membership_number} onChange={set('membership_number')} placeholder="Membership number" required
            className="px-3 py-2 rounded text-sm border border-slate-light outline-none focus:border-ember" />
          <div className="grid grid-cols-2 gap-3">
            <input value={form.first_name} onChange={set('first_name')} placeholder="First name" required
              className="px-3 py-2 rounded text-sm border border-slate-light outline-none focus:border-ember" />
            <input value={form.last_name} onChange={set('last_name')} placeholder="Last name" required
              className="px-3 py-2 rounded text-sm border border-slate-light outline-none focus:border-ember" />
          </div>
          <input value={form.email} onChange={set('email')} placeholder="Email" type="email"
            className="px-3 py-2 rounded text-sm border border-slate-light outline-none focus:border-ember" />
          <input value={form.phone} onChange={set('phone')} placeholder="Phone"
            className="px-3 py-2 rounded text-sm border border-slate-light outline-none focus:border-ember" />
          <div className="grid grid-cols-2 gap-3">
            <input value={form.department} onChange={set('department')} placeholder="Department (e.g. SAPS)"
              className="px-3 py-2 rounded text-sm border border-slate-light outline-none focus:border-ember" />
            <select value={form.province} onChange={set('province')} className="px-3 py-2 rounded text-sm border border-slate-light outline-none focus:border-ember">
              <option value="">Province...</option>
              {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <input value={form.shop_steward_name} onChange={set('shop_steward_name')} placeholder="Shop Steward name (optional)"
            className="px-3 py-2 rounded text-sm border border-slate-light outline-none focus:border-ember" />
          {error && <p className="text-xs text-ember">{error}</p>}
          <button type="submit" disabled={submitting} className="mt-2 py-2.5 rounded text-sm font-semibold text-white bg-ember disabled:opacity-60">
            {submitting ? 'Registering…' : 'Register Member'}
          </button>
        </form>
      </div>
    </div>
  );
}

function MemberDetailPanel({ member, onClose, canVerify, onVerified }) {
  const [cases, setCases] = useState(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    api.get(`/members/${member.id}/cases`).then(setCases).catch(() => setCases([]));
  }, [member.id]);

  const verify = async () => {
    setVerifying(true);
    try {
      await api.put(`/members/${member.id}/verify`);
      onVerified();
      onClose();
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/40" onClick={onClose}>
      <div className="h-full p-6 overflow-y-auto bg-white w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <span className="font-mono text-xs text-slate">{member.membership_number}</span>
          <button onClick={onClose}><X size={18} className="text-slate" /></button>
        </div>
        <h3 className="font-display font-bold text-lg mb-4">{member.first_name} {member.last_name}</h3>

        <div className="flex flex-col gap-2 text-sm mb-5">
          <div className="flex justify-between"><span className="text-slate">Email</span><span>{member.email || '—'}</span></div>
          <div className="flex justify-between"><span className="text-slate">Phone</span><span>{member.phone || '—'}</span></div>
          <div className="flex justify-between"><span className="text-slate">Department</span><span>{member.department || '—'}</span></div>
          <div className="flex justify-between"><span className="text-slate">Province</span><span>{member.province || '—'}</span></div>
        </div>

        {member.pending_verification && (
          <div className="flex items-center justify-between mb-5 px-3 py-2.5 rounded bg-gold/10 border border-gold/30">
            <span className="flex items-center gap-1.5 text-xs"><AlertCircle size={13} /> Pending verification</span>
            {canVerify && (
              <button onClick={verify} disabled={verifying} className="flex items-center gap-1 text-xs font-semibold text-ember">
                <CheckCircle2 size={13} /> {verifying ? 'Verifying…' : 'Mark verified'}
              </button>
            )}
          </div>
        )}

        <h4 className="font-display text-sm font-semibold mb-3">Case History</h4>
        <div className="flex flex-col gap-2">
          {cases === null && <p className="text-sm text-slate">Loading…</p>}
          {cases?.length === 0 && <p className="text-sm text-slate">No cases on record.</p>}
          {cases?.map((c) => (
            <div key={c.case_reference} className="flex items-center justify-between px-3 py-2 rounded border border-slate-light text-sm">
              <div>
                <p className="font-mono text-xs">{c.case_reference}</p>
                <p className="text-slate text-xs mt-0.5">{c.type_of_matter}</p>
              </div>
              <StatusBadge status={c.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
