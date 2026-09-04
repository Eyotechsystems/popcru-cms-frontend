import React from 'react';
import { useAuth } from '../context/AuthContext';
import CoordinatorOverview from './CoordinatorOverview';
import PractitionerDashboard from './PractitionerDashboard';
import AttorneyDashboard from './AttorneyDashboard';

// Routes each role to the landing view suited to what they're
// actually permitted to see — Practitioners and Attorneys can't hit
// /dashboard/stats or /reports/* on the backend, so they get their
// own scoped views rather than an error-throwing shared one.
export default function Dashboard() {
  const { user } = useAuth();

  if (user?.role === 'practitioner') return <PractitionerDashboard />;
  if (user?.role === 'attorney') return <AttorneyDashboard />;

  // coordinator, manager, system_admin
  return <CoordinatorOverview />;
}
