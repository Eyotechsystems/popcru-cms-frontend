import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Send, Upload, FileText, Download, Clock,
  Gavel, History, MessageSquare, User,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import FlameMark from '../components/FlameMark';
import StatusBadge from '../components/StatusBadge';

const TABS = [
  { key: 'overview', label: 'Overview', icon: User },
  { key: 'notes', label: 'Notes', icon: FileText },
  { key: 'documents', label: 'Documents', icon: Upload },
  { key: 'messages', label: 'Messages', icon: MessageSquare },
  { key: 'court', label: 'Court Updates', icon: Gavel },
  { key: 'history', label: 'Allocation History', icon: History },
];

const timeAgo = (iso) => {
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
};

export default function CaseWorkspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const [practitioners, setPractitioners] = useState([]);

  const load = useCallback(() => {
    api.get(`/cases/${id}`).then(setDetail).catch((err) => setError(err.body?.error || 'Unable to load case.'));
  }, [id]);

  useEffect(() => {
    load();
    api.get('/users/practitioners').then(setPractitioners).catch(() => setPractitioners([]));
  }, [load]);

  const canEditCase = ['coordinator', 'manager', 'system_admin', 'practitioner'].includes(user?.role);

  if (error) {
    return (
      <Layout>
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-slate mb-4">
          <ArrowLeft size={15} /> Back
        </button>
        <p className="text-sm text-ember bg-ember/5 border border-ember/20 rounded px-4 py-3">{error}</p>
      </Layout>
    );
  }

  if (!detail) {
    return (
      <Layout>
        <p className="text-sm text-slate">Loading case…</p>
      </Layout>
    );
  }

  const { case: c } = detail;

  return (
    <Layout>
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-slate mb-4 hover:text-ink">
        <ArrowLeft size={15} /> Back
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate mb-1">{c.case_reference}</div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <FlameMark priority={c.priority} size={20} />
            {c.member_name}
          </h1>
          <p className="text-sm text-slate mt-1">{c.type_of_matter} · {c.province}</p>
        </div>
        <StatusBadge status={c.status} />
      </div>

      <div className="flex gap-1 mb-6 border-b border-slate-light">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors"
            style={{
              color: tab === t.key ? '#C4321F' : '#6B655C',
              borderBottom: tab === t.key ? '2px solid #C4321F' : '2px solid transparent',
            }}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <OverviewTab detail={detail} practitioners={practitioners} canEdit={canEditCase} onUpdated={load} />
      )}
      {tab === 'notes' && <NotesTab caseId={id} notes={detail.notes} canEdit={canEditCase} onUpdated={load} />}
      {tab === 'documents' && <DocumentsTab caseId={id} documents={detail.documents} onUpdated={load} />}
      {tab === 'messages' && <MessagesTab caseId={id} />}
      {tab === 'court' && <CourtUpdatesTab updates={detail.courtUpdates} />}
      {tab === 'history' && <HistoryTab history={detail.allocationHistory} />}
    </Layout>
  );
}

// ── Overview ─────────────────────────────────────────────────
function OverviewTab({ detail, practitioners, canEdit, onUpdated }) {
  const { case: c } = detail;
  const [assignTo, setAssignTo] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [warning, setWarning] = useState('');
  const isReallocation = !!c.practitioner_id;

  const allocate = async () => {
    if (!assignTo) return;
    if (isReallocation && !reason.trim()) { setErr('A reason is required when reallocating a case.'); return; }
    setBusy(true); setErr(''); setWarning('');
    try {
      const result = await api.put(`/cases/${c.id}/allocate`, { practitioner_id: assignTo, notes: reason || undefined });
      if (result.workloadWarning) setWarning(result.workloadWarning);
      setAssignTo(''); setReason('');
      onUpdated();
    } catch (e) {
      setErr(e.body?.error || 'Error allocating case.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-3 gap-5">
      <div className="col-span-2 bg-white rounded-lg p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <h3 className="font-display text-sm font-semibold mb-4">Case Details</h3>
        <dl className="grid grid-cols-2 gap-y-3 text-sm">
          <dt className="text-slate">Referral type</dt><dd className="font-medium">{c.referral_type}</dd>
          <dt className="text-slate">Allocation level</dt><dd className="font-medium">{c.allocation_level}</dd>
          <dt className="text-slate">Practitioner</dt><dd className="font-medium">{c.practitioner_name || '—'}</dd>
          <dt className="text-slate">Registered</dt><dd className="font-medium">{new Date(c.created_at).toLocaleDateString('en-ZA')}</dd>
        </dl>
        {c.description && (
          <div className="mt-4 pt-4 border-t border-slate-light">
            <p className="text-xs text-slate mb-1">Description</p>
            <p className="text-sm">{c.description}</p>
          </div>
        )}
      </div>

      {canEdit && (
        <div className="bg-white rounded-lg p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <h3 className="font-display text-sm font-semibold mb-3">
            {isReallocation ? 'Reallocate' : 'Allocate'} to Practitioner
          </h3>
          <select value={assignTo} onChange={(e) => setAssignTo(e.target.value)}
            className="w-full px-3 py-2 rounded text-sm border border-slate-light outline-none focus:border-ember">
            <option value="">Select practitioner...</option>
            {practitioners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {isReallocation && (
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (required)"
              className="w-full mt-2 px-3 py-2 rounded text-sm border border-slate-light outline-none focus:border-ember" />
          )}
          <button onClick={allocate} disabled={!assignTo || busy}
            className="w-full mt-2 py-2 rounded text-sm font-semibold text-white bg-ember disabled:bg-slate-light disabled:text-slate">
            {busy ? 'Working…' : isReallocation ? 'Reallocate' : 'Allocate'}
          </button>
          {err && <p className="text-xs text-ember mt-2">{err}</p>}
          {warning && <p className="text-xs mt-2 px-3 py-2 rounded bg-gold/10 border border-gold/30">⚠ {warning}</p>}
        </div>
      )}
    </div>
  );
}

// ── Notes ────────────────────────────────────────────────────
function NotesTab({ caseId, notes, canEdit, onUpdated }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    try {
      await api.post(`/cases/${caseId}/notes`, { note_text: text.trim() });
      setText('');
      onUpdated();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-lg p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      {canEdit && (
        <form onSubmit={submit} className="flex gap-2 mb-5">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a progress note..."
            className="flex-1 px-3 py-2 rounded text-sm border border-slate-light outline-none focus:border-ember" />
          <button type="submit" disabled={busy || !text.trim()} className="px-4 py-2 rounded text-sm font-semibold text-white bg-ember disabled:opacity-50">
            Add Note
          </button>
        </form>
      )}
      <div className="flex flex-col gap-3">
        {(!notes || notes.length === 0) && <p className="text-sm text-slate text-center py-6">No notes yet.</p>}
        {notes?.map((n) => (
          <div key={n.id} className="border-l-2 border-slate-light pl-3 py-1">
            <p className="text-sm">{n.note_text}</p>
            <p className="text-xs text-slate mt-1">{n.author} · {timeAgo(n.created_at)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Documents ────────────────────────────────────────────────
function DocumentsTab({ caseId, documents, onUpdated }) {
  const fileRef = useRef(null);
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [urlLoading, setUrlLoading] = useState(null);

  const upload = async (e) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError('');
    const formData = new FormData();
    formData.append('document', file);
    if (description) formData.append('description', description);
    try {
      await api.post(`/cases/${caseId}/documents`, formData, { isFormData: true });
      setDescription('');
      fileRef.current.value = '';
      onUpdated();
    } catch (err) {
      setUploadError(err.body?.error || 'Error uploading document.');
    } finally {
      setUploading(false);
    }
  };

  const viewDocument = async (docId) => {
    setUrlLoading(docId);
    try {
      const { url } = await api.get(`/documents/${docId}/url`);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      alert(err.body?.error || 'Unable to generate document link.');
    } finally {
      setUrlLoading(null);
    }
  };

  const formatSize = (bytes) => bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

  return (
    <div className="bg-white rounded-lg p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <form onSubmit={upload} className="flex gap-2 mb-5 items-start">
        <input ref={fileRef} type="file" className="flex-1 text-sm" required />
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)"
          className="px-3 py-2 rounded text-sm border border-slate-light outline-none focus:border-ember" />
        <button type="submit" disabled={uploading} className="px-4 py-2 rounded text-sm font-semibold text-white bg-ember disabled:opacity-50 whitespace-nowrap">
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
      </form>
      {uploadError && <p className="text-xs text-ember mb-3">{uploadError}</p>}

      <div className="flex flex-col gap-2">
        {(!documents || documents.length === 0) && <p className="text-sm text-slate text-center py-6">No documents uploaded yet.</p>}
        {documents?.map((d) => (
          <div key={d.id} className="flex items-center justify-between px-3 py-2.5 rounded border border-slate-light">
            <div className="flex items-center gap-2.5 min-w-0">
              <FileText size={16} className="text-slate shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{d.file_name}</p>
                <p className="text-xs text-slate">{formatSize(d.file_size)} · {d.uploaded_by_name} · {timeAgo(d.uploaded_at)}</p>
              </div>
            </div>
            <button onClick={() => viewDocument(d.id)} disabled={urlLoading === d.id}
              className="flex items-center gap-1 text-xs font-medium text-ember shrink-0 ml-3">
              <Download size={13} /> {urlLoading === d.id ? '…' : 'View'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Messages ─────────────────────────────────────────────────
function MessagesTab({ caseId }) {
  const [messages, setMessages] = useState(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(() => {
    api.get(`/cases/${caseId}/messages`).then(setMessages).catch(() => setMessages([]));
  }, [caseId]);

  useEffect(() => { load(); }, [load]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      await api.post(`/cases/${caseId}/messages`, { message: text.trim() });
      setText('');
      load();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white rounded-lg p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div className="flex flex-col gap-3 mb-4 max-h-96 overflow-y-auto">
        {messages?.length === 0 && <p className="text-sm text-slate text-center py-6">No messages yet — start the conversation.</p>}
        {messages?.map((m) => (
          <div key={m.id} className="flex gap-2.5">
            <div className="w-7 h-7 rounded-full bg-ink text-white flex items-center justify-center text-xs font-semibold shrink-0">
              {m.sender_name?.[0] || '?'}
            </div>
            <div>
              <p className="text-xs text-slate">{m.sender_name} <span className="text-slate/70">· {timeAgo(m.created_at)}</span></p>
              <p className="text-sm mt-0.5">{m.message}</p>
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={send} className="flex gap-2 pt-3 border-t border-slate-light">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a message..."
          className="flex-1 px-3 py-2 rounded text-sm border border-slate-light outline-none focus:border-ember" />
        <button type="submit" disabled={sending || !text.trim()} className="px-3 py-2 rounded text-white bg-ember disabled:opacity-50">
          <Send size={15} />
        </button>
      </form>
    </div>
  );
}

// ── Court Updates ────────────────────────────────────────────
function CourtUpdatesTab({ updates }) {
  return (
    <div className="bg-white rounded-lg p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      {(!updates || updates.length === 0) && <p className="text-sm text-slate text-center py-6">No court updates recorded.</p>}
      <div className="flex flex-col gap-4">
        {updates?.map((u) => (
          <div key={u.id} className="border-l-2 pl-3" style={{ borderColor: '#E8B32D' }}>
            <p className="text-sm font-medium">{u.court_name || 'Court update'}</p>
            <p className="text-sm mt-1">{u.update_text}</p>
            {u.outcome && <p className="text-xs text-slate mt-1">Outcome: {u.outcome}</p>}
            <p className="text-xs text-slate mt-1">{u.attorney_name} · {timeAgo(u.created_at)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Allocation History ───────────────────────────────────────
function HistoryTab({ history }) {
  return (
    <div className="bg-white rounded-lg p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      {(!history || history.length === 0) && <p className="text-sm text-slate text-center py-6">No allocation history.</p>}
      <div className="flex flex-col gap-3">
        {history?.map((h) => (
          <div key={h.id} className="flex items-center gap-3 text-sm">
            <Clock size={14} className="text-slate shrink-0" />
            <span>
              Allocated to <strong>{h.practitioner_name}</strong> by {h.allocated_by_name}
              {h.notes && <span className="text-slate"> — "{h.notes}"</span>}
            </span>
            <span className="text-xs text-slate ml-auto shrink-0">{timeAgo(h.allocated_at)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
