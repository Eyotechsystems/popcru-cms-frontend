import React from 'react';
import { NavLink } from 'react-router-dom';
import { Flame, LayoutDashboard, FileText, Users, UserCog, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ROLE_LABEL = {
  system_admin: 'System Administrator',
  coordinator: 'Coordinator',
  manager: 'Manager',
  practitioner: 'Practitioner',
  attorney: 'Attorney',
};

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, roles: null },
  { to: '/cases', label: 'Cases', icon: FileText, roles: null },
  // Hidden for Attorneys: the member directory isn't scoped to their
  // assigned cases the way case data is (FR 4.3.7 restricts an
  // Attorney to name + case reference only) — worth a proper backend
  // fix too, this is a UI-level reduction in the meantime.
  { to: '/members', label: 'Members', icon: Users, roles: ['system_admin', 'coordinator', 'manager', 'practitioner'] },
  // Matches GET /users on the backend — System Admin has full control,
  // Manager can view and set practitioner workload limits.
  { to: '/users', label: 'Users', icon: UserCog, roles: ['system_admin', 'manager'] },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navItems = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user?.role));

  return (
    <div className="min-h-screen bg-paper flex">
      <aside className="bg-ink w-56 shrink-0 flex flex-col">
        <div className="flex items-center gap-2 px-5 py-6">
          <Flame size={22} className="text-gold" />
          <span className="font-display text-white font-bold tracking-wide text-sm">POPCRU CMS</span>
        </div>

        <nav className="flex flex-col gap-1 px-3 mt-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-colors ${
                  isActive ? 'bg-gold/10 text-gold border-l-2 border-gold' : 'text-slate-light/70 border-l-2 border-transparent hover:text-white'
                }`
              }
            >
              <item.icon size={16} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto px-5 py-5">
          <div className="text-xs text-slate-light/50 mb-1">Signed in as</div>
          <div className="text-sm text-slate-light mb-3">
            {user ? `${user.firstName} ${user.lastName}` : ''}
            <div className="text-xs text-slate-light/60">{ROLE_LABEL[user?.role] || user?.role}</div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-xs text-slate-light/60 hover:text-white transition-colors"
          >
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 px-8 py-7 overflow-y-auto">{children}</main>
    </div>
  );
}
