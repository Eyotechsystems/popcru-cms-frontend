import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, ChevronRight, Gavel } from 'lucide-react';
import { api } from '../lib/api';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';

export default function AttorneyDashboard() {
  const navigate = useNavigate();
  const [cases, setCases] = useState(null);

  useEffect(() => {
    api.get('/attorney/my-cases').then(setCases).catch(() => setCases([]));
  }, []);

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold flex items-center gap-2">
          <Gavel size={22} className="text-ember" /> Assigned Cases
        </h1>
        <p className="text-sm text-slate mt-0.5">
          {cases === null ? 'Loading…' : `${cases.length} case${cases.length === 1 ? '' : 's'} currently assigned to you`}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {cases?.length === 0 && (
          <div className="bg-white rounded-lg p-8 text-center text-sm text-slate" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            No cases are currently assigned to you.
          </div>
        )}
        {cases?.map((c) => (
          <button
            key={c.id}
            onClick={() => navigate(`/cases/${c.id}`)}
            className="flex items-center justify-between text-left bg-white rounded-lg p-4 hover:translate-y-[-1px] transition-transform"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)', borderTop: '3px solid #E8B32D' }}
          >
            <div>
              <p className="font-mono text-xs text-slate">{c.case_reference}</p>
              <p className="font-display font-semibold mt-0.5">{c.member_name}</p>
              <p className="text-sm text-slate mt-0.5 flex items-center gap-3">
                {c.type_of_matter}
                <span className="flex items-center gap-1"><MapPin size={11} />{c.province}</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={c.status} />
              <ChevronRight size={16} className="text-slate" />
            </div>
          </button>
        ))}
      </div>
    </Layout>
  );
}
