import React, { useState, useEffect } from 'react';
import { X, MapPin, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import FlameMark from './FlameMark';
import StatusBadge from './StatusBadge';

export default function CaseDetailPanel({ caseSummary, onClose, onAllocated }) {
  const navigate = useNavigate();
  const [practitioners, setPractitioners] = useState([]);
  const [assignTo, setAssignTo] = useState('');
  const [reason, setReason] = useState('');
  const [allocating, setAllocating] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');

  const isReallocation = !!caseSummary.practitioner_name;

  useEffect(() => {
    api.get('/users/practitioners').then(setPractitioners).catch(() => setPractitioners([]));
  }, []);

  const allocate = async () => {
    if (!assignTo) return;
    if (isReallocation && !reason.trim()) {
      setError('A reason is required when reallocating a case.');
      return;
    }
    setAllocating(true);
    setError('');
    setWarning('');
    try {
      const res = await api.put(`/cases/${caseSummary.id}/allocate`, {
        practitioner_id: assignTo,
        ...(reason.trim() ? { notes: reason.trim() } : {}),
      });
      if (res.workloadWarning) setWarning(res.workloadWarning);
      const practitioner = practitioners.find((p) => p.id === assignTo);
      onAllocated?.(caseSummary.id, practitioner?.name || null);
      setAssignTo('');
      setReason('');
    } catch (err) {
      setError(err.body?.error || 'Error allocating case.');
    } finally {
      setAllocating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/40" onClick={onClose}>
      <div className="h-full p-6 overflow-y-auto bg-white w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <span className="font-mono text-xs text-slate">{caseSummary.case_reference}</span>
          <button onClick={onClose} aria-label="Close"><X size={18} className="text-slate" /></button>
        </div>
        <h3 className="font-display font-bold text-lg mb-1 flex items-center gap-2">
          <FlameMark priority={caseSummary.priority} size={18} />
          {caseSummary.member_name}
        </h3>
        <button
          onClick={() => navigate(`/cases/${caseSummary.id}`)}
          className="flex items-center gap-1 text-xs font-medium text-ember mb-4"
        >
          Open full case <ArrowUpRight size={12} />
        </button>

        <div className="flex flex-col gap-3 text-sm">
          <div className="flex justify-between"><span className="text-slate">Matter</span><span className="font-medium">{caseSummary.type_of_matter}</span></div>
          <div className="flex justify-between items-center">
            <span className="text-slate flex items-center gap-1"><MapPin size={12} />Province</span>
            <span className="font-medium">{caseSummary.province}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate">Status</span>
            <StatusBadge status={caseSummary.status} />
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-slate-light">
          <label className="text-xs font-medium text-slate">
            {isReallocation ? 'Reallocate to' : 'Allocate to'} practitioner
          </label>
          <div className="flex gap-2 mt-2">
            <select
              value={assignTo}
              onChange={(e) => setAssignTo(e.target.value)}
              className="flex-1 px-3 py-2 rounded text-sm border border-slate-light outline-none focus:border-ember"
            >
              <option value="">Select practitioner...</option>
              {practitioners.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <button
              onClick={allocate}
              disabled={!assignTo || allocating}
              className="px-4 py-2 rounded text-sm font-semibold text-white disabled:bg-slate-light"
              style={{ background: assignTo && !allocating ? '#C4321F' : undefined }}
            >
              {allocating ? '…' : 'Allocate'}
            </button>
          </div>
          {isReallocation && (
            <div className="mt-2">
              <label className="text-xs font-medium text-slate">Reason for reallocation (required)</label>
              <textarea
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Practitioner on leave, case reassigned for coverage"
                className="w-full mt-1 px-3 py-2 rounded text-sm border border-slate-light outline-none focus:border-ember"
              />
            </div>
          )}
          {caseSummary.practitioner_name && !warning && (
            <p className="text-xs mt-3 text-slate">
              Currently allocated to <strong className="text-ink">{caseSummary.practitioner_name}</strong>.
            </p>
          )}
          {warning && (
            <p className="text-xs mt-3 text-ember bg-ember/5 border border-ember/20 rounded px-3 py-2">{warning}</p>
          )}
          {error && <p className="text-xs mt-3 text-ember">{error}</p>}
        </div>
      </div>
    </div>
  );
}
