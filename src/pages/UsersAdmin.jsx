import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Search, Plus, X, KeyRound, Users as UsersIcon, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

const ROLES = [
  { value: 'system_admin', label: 'System Administrator', short: 'Sys Admin', color: '#14110F' },
  { value: 'coordinator', label: 'Admin (Coordinator)', short: 'Admin', color: '#C4321F' },
  { value: 'manager', label: 'Manager', short: 'Manager', color: '#E8B32D' },
  { value: 'practitioner', label: 'Practitioner', short: 'Practitioner', color: '#4B7A51' },
  { value: 'attorney', label: 'Attorney', short: 'Attorney', color: '#6B655C' },
];
const ROLE_LABEL = Object.fromEntries(ROLES.map((r) => [r.value, r.label]));
const ROLE_COLOR = Object.fromEntries(ROLES.map((r) => [r.value, r.color]));
const PROVINCES = ['Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape', 'Western Cape'];

const CountUp = ({ value, duration = 600 }) => {
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

const initials = (u) => `${u.first_name?.[0] || ''}${u.last_name?.[0] || ''}`.toUpperCase();

export default function UsersAdmin() {
  const { user: me } = useAuth();
  const isSystemAdmin = me?.role === 'system_admin';
  const [users, setUsers] = useState(null);
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState(null);

  const notify = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2800); };

  // Staff lists are small, so load everyone once and filter locally —
  // keeps the role chips' counts live and filtering instant.
  const load = useCallback(() => {
    api.get('/users').then(setUsers).catch(() => setUsers([]));
  }, []);
  useEffect(() => { load(); }, [load]);

  const all = users || [];
  const counts = useMemo(() => {
    const c = {};
    all.forEach((u) => { c[u.role] = (c[u.role] || 0) + 1; });
    return c;
  }, [all]);

  const visible = all.filter((u) => {
    if (roleFilter && u.role !== roleFilter) return false;
    if (search && !`${u.first_name} ${u.last_name} ${u.username} ${u.email}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <Layout>
      <style>{`
        @keyframes rowIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .user-row { animation: rowIn 0.35s cubic-bezier(0.16,1,0.3,1) both; transition: background 0.12s ease; }
        .role-chip { transition: transform 0.18s ease, box-shadow 0.18s ease; }
        .role-chip:hover { transform: translateY(-2px); }
        .toast-enter { animation: toastIn 0.25s cubic-bezier(0.16,1,0.3,1); }
        @keyframes toastIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <UsersIcon size={22} className="text-ember" /> User Management
          </h1>
          <p className="text-sm text-slate mt-0.5"><CountUp value={all.length} /> staff account{all.length === 1 ? '' : 's'}</p>
        </div>
        {isSystemAdmin && (
          <button onClick={() => setShowNew(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold text-white bg-ember">
            <Plus size={16} /> New User
          </button>
        )}
      </div>

      <div className="grid grid-cols-5 gap-3 mb-5">
        {ROLES.map((r) => (
          <button key={r.value} onClick={() => setRoleFilter(roleFilter === r.value ? '' : r.value)}
            className="role-chip text-left p-3 rounded-xl bg-white"
            style={{
              borderTop: `3px solid ${roleFilter === r.value ? r.color : '#E4DFD3'}`,
              boxShadow: roleFilter === r.value ? '0 4px 14px rgba(20,17,15,0.08)' : '0 1px 3px rgba(0,0,0,0.04)',
            }}>
            <p className="text-xs text-slate mb-1">{r.short}</p>
            <span className="font-display text-2xl font-bold"><CountUp value={counts[r.value] || 0} /></span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-white border border-slate-light max-w-sm mb-4">
        <Search size={14} className="text-slate" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, username, email..."
          className="bg-transparent outline-none text-sm w-full" />
      </div>

      <div className="rounded-xl overflow-hidden bg-white" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase text-slate">
              <th className="text-left font-medium px-5 py-2">User</th>
              <th className="text-left font-medium px-2 py-2">Role</th>
              <th className="text-left font-medium px-2 py-2">Province</th>
              <th className="text-left font-medium px-2 py-2">Status</th>
              <th className="text-left font-medium px-2 py-2">Last login</th>
            </tr>
          </thead>
          <tbody>
            {users === null && <tr><td colSpan={5} className="text-center py-8 text-sm text-slate">Loading…</td></tr>}
            {users !== null && visible.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-sm text-slate">No users match this filter.</td></tr>}
            {visible.map((u, i) => (
              <tr key={u.id} onClick={() => setSelected(u)} className="user-row cursor-pointer border-t border-slate-light hover:bg-paper"
                style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ background: ROLE_COLOR[u.role] || '#6B655C' }}>{initials(u)}</span>
                    <div>
                      <p className="font-medium leading-tight">{u.first_name} {u.last_name}</p>
                      <p className="text-xs text-slate">{u.username}</p>
                    </div>
                  </div>
                </td>
                <td className="px-2 py-3">{ROLE_LABEL[u.role] || u.role}</td>
                <td className="px-2 py-3 text-slate">{u.province || '—'}</td>
                <td className="px-2 py-3">
                  <span className="px-2 py-0.5 rounded text-xs font-medium" style={{
                    background: u.is_active ? 'rgba(75,122,81,0.1)' : 'rgba(196,50,31,0.1)',
                    color: u.is_active ? '#4B7A51' : '#C4321F',
                  }}>{u.is_active ? 'Active' : 'Inactive'}</span>
                </td>
                <td className="px-2 py-3 text-slate text-xs">{u.last_login ? new Date(u.last_login).toLocaleDateString('en-ZA') : 'Never'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showNew && <NewUserModal onClose={() => setShowNew(false)} onCreated={(msg) => { setShowNew(false); notify(msg); load(); }} />}
      {selected && (
        <UserDetailPanel targetUser={selected} isSystemAdmin={isSystemAdmin}
          onClose={() => setSelected(null)} onNotify={notify}
          onUpdated={(msg) => { setSelected(null); notify(msg); load(); }} />
      )}

      {toast && (
        <div className="toast-enter fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-full flex items-center gap-2 text-sm text-white z-[60]"
          style={{ background: '#14110F', boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}>
          <CheckCircle2 size={14} color="#E8B32D" /> {toast}
        </div>
      )}
    </Layout>
  );
}

function NewUserModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    username: '', email: '', password: '', first_name: '', last_name: '',
    role: 'practitioner', phone: '', province: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.post('/users', form);
      onCreated(`${form.first_name} ${form.last_name} created`);
    } catch (err) {
      setError(err.body?.error || 'Error creating user.');
    } finally {
      setSubmitting(false);
    }
  };

  const input = 'px-3 py-2 rounded text-sm border border-slate-light outline-none focus:border-ember';
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-ink/50 px-4" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 w-full max-w-md border-t-4 border-ember max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-lg">New User</h3>
          <button onClick={onClose}><X size={18} className="text-slate" /></button>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <input value={form.first_name} onChange={set('first_name')} placeholder="First name" required className={input} />
            <input value={form.last_name} onChange={set('last_name')} placeholder="Last name" required className={input} />
          </div>
          <input value={form.username} onChange={set('username')} placeholder="Username" required className={input} />
          <input value={form.email} onChange={set('email')} type="email" placeholder="Email" required className={input} />
          <input value={form.password} onChange={set('password')} type="password" placeholder="Temporary password (min. 8 characters)" required minLength={8} className={input} />
          <select value={form.role} onChange={set('role')} required className={input}>
            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input value={form.phone} onChange={set('phone')} placeholder="Phone (optional)" className={input} />
            <select value={form.province} onChange={set('province')} className={input}>
              <option value="">Province...</option>
              {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          {error && <p className="text-xs text-ember">{error}</p>}
          <button type="submit" disabled={submitting} className="mt-2 py-2.5 rounded text-sm font-semibold text-white bg-ember disabled:opacity-60">
            {submitting ? 'Creating…' : 'Create User'}
          </button>
        </form>
      </div>
    </div>
  );
}

function UserDetailPanel({ targetUser, isSystemAdmin, onClose, onUpdated, onNotify }) {
  const [form, setForm] = useState({
    first_name: targetUser.first_name, last_name: targetUser.last_name, email: targetUser.email,
    role: targetUser.role, phone: targetUser.phone || '', province: targetUser.province || '',
    is_active: targetUser.is_active,
  });
  const [maxLoad, setMaxLoad] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: key === 'is_active' ? e.target.value === 'true' : e.target.value }));

  const save = async () => {
    setSaving(true); setError('');
    try {
      await api.put(`/users/${targetUser.id}`, form);
      onUpdated(`${form.first_name} ${form.last_name} updated`);
    } catch (err) {
      setError(err.body?.error || 'Error updating user.');
    } finally { setSaving(false); }
  };

  const saveWorkload = async () => {
    setSaving(true); setError('');
    try {
      await api.put(`/users/${targetUser.id}/workload-limit`, { max_case_load: maxLoad === '' ? null : Number(maxLoad) });
      onUpdated(maxLoad === '' ? 'Workload limit reset to system default' : `Workload limit set to ${maxLoad}`);
    } catch (err) {
      setError(err.body?.error || 'Error updating workload limit.');
    } finally { setSaving(false); }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setSaving(true); setError('');
    try {
      await api.put(`/users/${targetUser.id}/reset-password`, { newPassword });
      onNotify(`Password reset for ${targetUser.first_name} ${targetUser.last_name}`);
      setNewPassword('');
      setShowPasswordReset(false);
    } catch (err) {
      setError(err.body?.error || 'Error resetting password.');
    } finally { setSaving(false); }
  };

  const input = 'px-3 py-2 rounded text-sm border border-slate-light outline-none focus:border-ember';
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/40" onClick={onClose}>
      <div className="h-full p-6 overflow-y-auto bg-white w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
              style={{ background: ROLE_COLOR[targetUser.role] || '#6B655C' }}>{initials(targetUser)}</span>
            <div>
              <h3 className="font-display font-bold text-lg leading-tight">{targetUser.first_name} {targetUser.last_name}</h3>
              <p className="text-xs text-slate">{targetUser.username}</p>
            </div>
          </div>
          <button onClick={onClose}><X size={18} className="text-slate" /></button>
        </div>

        {isSystemAdmin ? (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <input value={form.first_name} onChange={set('first_name')} placeholder="First name" className={input} />
              <input value={form.last_name} onChange={set('last_name')} placeholder="Last name" className={input} />
            </div>
            <input value={form.email} onChange={set('email')} type="email" placeholder="Email" className={input} />
            <select value={form.role} onChange={set('role')} className={input}>
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input value={form.phone} onChange={set('phone')} placeholder="Phone" className={input} />
              <select value={form.province} onChange={set('province')} className={input}>
                <option value="">Province...</option>
                {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <select value={String(form.is_active)} onChange={set('is_active')} className={input}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
            {error && <p className="text-xs text-ember">{error}</p>}
            <button onClick={save} disabled={saving} className="py-2 rounded text-sm font-semibold text-white bg-ember disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>

            <div className="pt-4 mt-2 border-t border-slate-light">
              {!showPasswordReset ? (
                <button onClick={() => setShowPasswordReset(true)} className="flex items-center gap-1.5 text-sm font-medium text-slate hover:text-ink">
                  <KeyRound size={14} /> Reset password
                </button>
              ) : (
                <form onSubmit={resetPassword} className="flex flex-col gap-2">
                  <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type="password"
                    placeholder="New temporary password (min. 8 characters)" minLength={8} required className={input} />
                  <div className="flex gap-2">
                    <button type="submit" disabled={saving} className="px-4 py-2 rounded text-sm font-semibold text-white bg-ember disabled:opacity-50">Confirm Reset</button>
                    <button type="button" onClick={() => setShowPasswordReset(false)} className="px-4 py-2 rounded text-sm font-medium text-slate">Cancel</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between"><span className="text-slate">Email</span><span>{targetUser.email}</span></div>
            <div className="flex justify-between"><span className="text-slate">Role</span><span>{ROLE_LABEL[targetUser.role]}</span></div>
            <div className="flex justify-between"><span className="text-slate">Province</span><span>{targetUser.province || '—'}</span></div>
            {error && <p className="text-xs text-ember">{error}</p>}
          </div>
        )}

        {targetUser.role === 'practitioner' && (
          <div className="mt-6 pt-5 border-t border-slate-light">
            <label className="text-xs font-medium text-slate">Workload limit (active cases)</label>
            <div className="flex gap-2 mt-2">
              <input value={maxLoad} onChange={(e) => setMaxLoad(e.target.value)} type="number" min={0}
                placeholder="System default" className={`flex-1 ${input}`} />
              <button onClick={saveWorkload} disabled={saving} className="px-4 py-2 rounded text-sm font-semibold text-white bg-ember disabled:opacity-50">Set</button>
            </div>
            <p className="text-xs text-slate mt-1.5">Leave blank to use the system default limit.</p>
          </div>
        )}
      </div>
    </div>
  );
}
