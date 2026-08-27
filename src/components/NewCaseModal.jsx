import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';

const REFERRAL_TYPES = [
  { value: 'self', label: 'Self-referred' },
  { value: 'shop_steward', label: 'Shop Steward' },
  { value: 'webform', label: 'Public webform' },
];
const ALLOCATION_LEVELS = [
  { value: 'national', label: 'National' },
  { value: 'provincial', label: 'Provincial' },
];

export default function NewCaseModal({ onClose, onCreated }) {
  const [dropdowns, setDropdowns] = useState({ type_of_matter: [], priority: [], province: [] });
  const [form, setForm] = useState({
    membership_number: '', type_of_matter: '', priority: 'Medium',
    referral_type: 'self', allocation_level: 'national', province: '',
    district: '', municipality: '', description: '',
  });
  const [member, setMember] = useState(null);
  const [memberError, setMemberError] = useState('');
  const [looking, setLooking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/dropdowns/type_of_matter').catch(() => []),
      api.get('/dropdowns/priority').catch(() => []),
      api.get('/dropdowns/province').catch(() => []),
    ]).then(([matter, priority, province]) => {
      setDropdowns({ type_of_matter: matter, priority, province });
      setForm((f) => ({
        ...f,
        type_of_matter: matter[0]?.list_value || '',
        province: province[0]?.list_value || '',
      }));
    });
  }, []);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const lookupMember = async () => {
    if (!form.membership_number.trim()) return;
    setLooking(true);
    setMemberError('');
    setMember(null);
    try {
      const data = await api.get(`/members/lookup/${encodeURIComponent(form.membership_number.trim())}`);
      setMember(data);
    } catch (err) {
      setMemberError(err.body?.error || 'Member not found. Check the membership number.');
    } finally {
      setLooking(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!member) {
      setSubmitError('Look up and confirm the member before registering the case.');
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      const data = await api.post('/cases', form);
      onCreated?.(data.case);
    } catch (err) {
      setSubmitError(err.body?.error || 'Error creating case. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-ink/50 px-4" onClick={onClose}>
      <div
        className="bg-white rounded-lg p-6 w-full max-w-md border-t-4 border-ember max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-lg">Register New Case</h3>
          <button onClick={onClose} aria-label="Close"><X size={18} className="text-slate" /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-medium text-slate">Membership number</label>
            <div className="flex gap-2 mt-1">
              <input
                value={form.membership_number}
                onChange={(e) => { setForm((f) => ({ ...f, membership_number: e.target.value })); setMember(null); }}
                placeholder="e.g. SAPS00421"
                className="flex-1 px-3 py-2 rounded text-sm border border-slate-light outline-none focus:border-ember"
                required
              />
              <button
                type="button"
                onClick={lookupMember}
                disabled={looking}
                className="px-3 py-2 rounded text-sm font-medium border border-slate-light text-ink"
              >
                {looking ? '…' : 'Look up'}
              </button>
            </div>
            {member && (
              <p className="flex items-center gap-1.5 text-xs text-green-700 mt-1.5">
                <CheckCircle2 size={13} /> {member.first_name} {member.last_name} — verified member
              </p>
            )}
            {memberError && (
              <p className="flex items-center gap-1.5 text-xs text-ember mt-1.5">
                <AlertCircle size={13} /> {memberError}
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-slate">Type of matter</label>
            <select value={form.type_of_matter} onChange={set('type_of_matter')} required
              className="w-full mt-1 px-3 py-2 rounded text-sm border border-slate-light outline-none focus:border-ember">
              {dropdowns.type_of_matter.map((d) => (
                <option key={d.id} value={d.list_value}>{d.list_value}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate">Priority</label>
              <select value={form.priority} onChange={set('priority')} required
                className="w-full mt-1 px-3 py-2 rounded text-sm border border-slate-light outline-none focus:border-ember">
                {dropdowns.priority.map((d) => (
                  <option key={d.id} value={d.list_value}>{d.list_value}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate">Province</label>
              <select value={form.province} onChange={set('province')} required
                className="w-full mt-1 px-3 py-2 rounded text-sm border border-slate-light outline-none focus:border-ember">
                {dropdowns.province.map((d) => (
                  <option key={d.id} value={d.list_value}>{d.list_value}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate">Referral type</label>
              <select value={form.referral_type} onChange={set('referral_type')} required
                className="w-full mt-1 px-3 py-2 rounded text-sm border border-slate-light outline-none focus:border-ember">
                {REFERRAL_TYPES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate">Allocation level</label>
              <select value={form.allocation_level} onChange={set('allocation_level')} required
                className="w-full mt-1 px-3 py-2 rounded text-sm border border-slate-light outline-none focus:border-ember">
                {ALLOCATION_LEVELS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate">Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={set('description')}
              placeholder="Brief summary of the matter..."
              className="w-full mt-1 px-3 py-2 rounded text-sm border border-slate-light outline-none focus:border-ember"
            />
          </div>

          {submitError && <p className="text-xs text-ember">{submitError}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 py-2.5 rounded text-sm font-semibold text-white bg-ember disabled:opacity-60"
          >
            {submitting ? 'Registering…' : 'Register Case'}
          </button>
        </form>
      </div>
    </div>
  );
}
