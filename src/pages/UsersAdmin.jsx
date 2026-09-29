import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, X, KeyRound, Users as UsersIcon } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

const ROLE_OPTIONS = [
  { value: '', label: 'All roles' },
  { value: 'system_admin', label: 'System Administrator' },
  { value: 'coordinator', label: 'Admin (Coordinator)' },
  { value: 'manager', label: 'Manager' },
  { value: 'practitioner', label: 'Practitioner' },
  { value: 'attorney', label: 'Attorney' },
];
const ROLE_LABEL = Object.fromEntries(ROLE_OPTIONS.filter((r) => r.value).map((r) => [r.value, r.label]));
const PROVINCES = ['Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape', 'Western Cape'];

export default function UsersAdmin() {
  const { user: me } = useAuth();
  const isSystemAdmin = me?.role === 'system_admin';
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState('');
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (role) params.set('role', role);
    if (search) params.set('search', search);
    api.get(`/users?${params.toString()}`).then(setUsers).finally(() => setLoading(false));
  }, [role, search]);

  useEffect(() => { load(); }, [load]);

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <UsersIcon size={22} className="text-ember" /> User Management
          </h1>
          <p className="text-sm text-slate mt-0.5">{users.length} user{users.length === 1 ? '' : 's'}</p>
        </div>
        {isSystemAdmin && (
          <button onClick={() => setShowNew(true)} className="flex items-center gap-2 px-4 py-2.5 rounded text-sm font-semibold text-white bg-ember">
            <Plus size={16} /> New User
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2 px-3 py-2 rounded bg-white border border-slate-light flex-1 max-w-xs">
          <Search size={14} className="text-slate" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, username, email..."
            className="bg-transparent outline-none text-sm w-full" />
        </div>
        <select value={role} onChange={(e) => setRole(e.target.value)} className="px-3 py-2 rounded text-sm border border-slate-light bg-white">
          {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      <div className="rounded-lg overflow-hidden bg-white" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase text-slate">
              <th className="text-left font-medium px-5 py-2">Name</th>
              <th className="text-left font-medium px-2 py-2">Username</th>
              <th className="text-left font-medium px-2 py-2">Role</th>
              <th className="text-left font-medium px-2 py-2">Province</th>
              <th className="text-left font-medium px-2 py-2">Status</th>
              <th className="text-left font-medium px-2 py-2">Last login</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="text-center py-8 text-sm text-slate">Loading…</td></tr>}
            {!loading && users.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-sm text-slate">No users found.</td></tr>}
            {!loading && users.map((u) => (
              <tr key={u.id} onClick={() => setSelected(u)} className="cursor-pointer border-t border-slate-light hover:bg-paper">
                <td className="px-5 py-3 font-medium">{u.first_name} {u.last_name}</td>
                <td className="px-2 py-3 text-slate">{u.username}</td>
                <td className="px-2 py-3">{ROLE_LABEL[u.role] || u.role}</td>
                <td className="px-2 py-3 text-slate">{u.province || '—'}</td>
                <td className="px-2 py-3">
                  <span className="px-2 py-0.5 rounded text-xs font-medium" style={{
                    background: u.is_active ? 'rgba(75,122,81,0.1)' : 'rgba(196,50,31,0.1)',
                    color: u.is_active ? '#4B7A51' : '#C4321F',
                  }}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-2 py-3 text-slate text-xs">{u.last_login ? new Date(u.last_login).toLocaleDateString('en-ZA') : 'Never'}</td>
                <td></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showNew && <NewUserModal onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); load(); }} />}
      {selected && (
        <UserDetailPanel
          targetUser={selected}
          isSystemAdmin={isSystemAdmin}
          onClose={() => setSelected(null)}
          onUpdated={() => { setSelected(null); load(); }}
        />
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
      onCreated();
    } catch (err) {
      setError(err.body?.error || 'Error creating user.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-ink/50 px-4" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 w-full max-w-md border-t-4 border-ember max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-lg">New User</h3>
          <button onClick={onClose}><X size={18} className="text-slate" /></button>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <input value={form.first_name} onChange={set('first_name')} placeholder="First name" required
              className="px-3 py-2 rounded text-sm border border-slate-light outline-none focus:border-ember" />
            <input value={form.last_name} onChange={set('last_name')} placeholder="Last name" required
              className="px-3 py-2 rounded text-sm border border-slate-light outline-none focus:border-ember" />
          </div>
          <input value={form.username} onChange={set('username')} placeholder="Username" required
            className="px-3 py-2 rounded text-sm border border-slate-light outline-none focus:border-ember" />
          <input value={form.email} onChange={set('email')} type="email" placeholder="Email" required
            className="px-3 py-2 rounded text-sm border border-slate-light outline-none focus:border-ember" />
          <input value={form.password} onChange={set('password')} type="password" placeholder="Temporary password (min. 8 characters)" required minLength={8}
            className="px-3 py-2 rounded text-sm border border-slate-light outline-none focus:border-ember" />
          <select value={form.role} onChange={set('role')} required
            className="px-3 py-2 rounded text-sm border border-slate-light outline-none focus:border-ember">
            {ROLE_OPTIONS.filter((r) => r.value).map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input value={form.phone} onChange={set('phone')} placeholder="Phone (optional)"
              className="px-3 py-2 rounded text-sm border border-slate-light outline-none focus:border-ember" />
            <select value={form.province} onChange={set('province')}
              className="px-3 py-2 rounded text-sm border border-slate-light outline-none focus:border-ember">
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

function UserDetailPanel({ targetUser, isSystemAdmin, onClose, onUpdated }) {
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
  const [resetMsg, setResetMsg] = useState('');

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: key === 'is_active' ? e.target.value === 'true' : e.target.value }));

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await api.put(`/users/${targetUser.id}`, form);
      onUpdated();
    } catch (err) {
      setError(err.body?.error || 'Error updating user.');
    } finally {
      setSaving(false);
    }
  };

  const saveWorkload = async () => {
    setSaving(true);
    setError('');
    try {
      await api.put(`/users/${targetUser.id}/workload-limit`, { max_case_load: maxLoad === '' ? null : Number(maxLoad) });
      onUpdated();
    } catch (err) {
      setError(err.body?.error || 'Error updating workload limit.');
    } finally {
      setSaving(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setSaving(true);
    setError('');
    try {
      await api.put(`/users/${targetUser.id}/reset-password`, { newPassword });
      setResetMsg('Password reset successfully.');
      setNewPassword('');
      setShowPasswordReset(false);
    } catch (err) {
      setError(err.body?.error || 'Error resetting password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/40" onClick={onClose}>
      <div className="h-full p-6 overflow-y-auto bg-white w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-lg">{targetUser.first_name} {targetUser.last_name}</h3>
          <button onClick={onClose}><X size={18} className="text-slate" /></button>
        </div>

        {isSystemAdmin ? (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <input value={form.first_name} onChange={set('first_name')} placeholder="First name"
                className="px-3 py-2 rounded text-sm border border-slate-light outline-none focus:border-ember" />
              <input value={form.last_name} onChange={set('last_name')} placeholder="Last name"
                className="px-3 py-2 rounded text-sm border border-slate-light outline-none focus:border-ember" />
            </div>
            <input value={form.email} onChange={set('email')} type="email" placeholder="Email"
              className="px-3 py-2 rounded text-sm border border-slate-light outline-none focus:border-ember" />
            <select value={form.role} onChange={set('role')}
              className="px-3 py-2 rounded text-sm border border-slate-light outline-none focus:border-ember">
              {ROLE_OPTIONS.filter((r) => r.value).map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input value={form.phone} onChange={set('phone')} placeholder="Phone"
                className="px-3 py-2 rounded text-sm border border-slate-light outline-none focus:border-ember" />
              <select value={form.province} onChange={set('province')}
                className="px-3 py-2 rounded text-sm border border-slate-light outline-none focus:border-ember">
                <option value="">Province...</option>
                {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <select value={String(form.is_active)} onChange={set('is_active')}
              className="px-3 py-2 rounded text-sm border border-slate-light outline-none focus:border-ember">
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>

            {error && <p className="text-xs text-ember">{error}</p>}
            <button onClick={save} disabled={saving} className="py-2 rounded text-sm font-semibold text-white bg-ember disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>

            <div className="pt-4 mt-2 border-t border-slate-light">
              {!showPasswordReset ? (
                <button onClick={() => setShowPasswordReset(true)} className="flex items-center gap-1.5 text-sm font-medium text-slate">
                  <KeyRound size={14} /> Reset password
                </button>
              ) : (
                <form onSubmit={resetPassword} className="flex flex-col gap-2">
                  <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type="password"
                    placeholder="New temporary password (min. 8 characters)" minLength={8} required
                    className="px-3 py-2 rounded text-sm border border-slate-light outline-none focus:border-ember" />
                  <div className="flex gap-2">
                    <button type="submit" disabled={saving} className="px-4 py-2 rounded text-sm font-semibold text-white bg-ember disabled:opacity-50">
                      Confirm Reset
                    </button>
                    <button type="button" onClick={() => setShowPasswordReset(false)} className="px-4 py-2 rounded text-sm font-medium text-slate">
                      Cancel
                    </button>
                  </div>
                </form>
              )}
              {resetMsg && <p className="text-xs text-green-700 mt-2">{resetMsg}</p>}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between"><span className="text-slate">Email</span><span>{targetUser.email}</span></div>
            <div className="flex justify-between"><span className="text-slate">Role</span><span>{ROLE_LABEL[targetUser.role]}</span></div>
            <div className="flex justify-between"><span className="text-slate">Province</span><span>{targetUser.province || '—'}</span></div>
          </div>
        )}

        {targetUser.role === 'practitioner' && (
          <div className="mt-6 pt-5 border-t border-slate-light">
            <label className="text-xs font-medium text-slate">Workload limit (active cases)</label>
            <div className="flex gap-2 mt-2">
              <input
                value={maxLoad}
                onChange={(e) => setMaxLoad(e.target.value)}
                type="number"
                min={0}
                placeholder="System default"
                className="flex-1 px-3 py-2 rounded text-sm border border-slate-light outline-none focus:border-ember"
              />
              <button onClick={saveWorkload} disabled={saving} className="px-4 py-2 rounded text-sm font-semibold text-white bg-ember disabled:opacity-50">
                Set
              </button>
            </div>
            <p className="text-xs text-slate mt-1.5">Leave blank to use the system default limit.</p>
          </div>
        )}
      </div>
    </div>
  );
}
