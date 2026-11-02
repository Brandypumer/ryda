import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LogoutButton, useAuth } from '../../features/identity';
import { BrandMark } from '../../shared/ui';

const linksByRole = {
  RIDER: [
    { to: '/rides', label: 'Book a ride', icon: 'route' },
    { to: '/rides/history', label: 'Ride history', icon: 'history' },
    { to: '/courier', label: 'Courier', icon: 'parcel' },
    { to: '/profile', label: 'Profile', icon: 'user' }
  ],
  DRIVER: [
    { to: '/driver', label: 'Driver dashboard', icon: 'dashboard' },
    { to: '/driver-verification', label: 'Verification', icon: 'check' },
    { to: '/payments', label: 'Wallet', icon: 'wallet' },
    { to: '/profile', label: 'Profile', icon: 'user' }
  ],
  ADMIN: [
    { to: '/admin', label: 'Admin dashboard', icon: 'dashboard' },
    { to: '/profile', label: 'Profile', icon: 'user' }
  ]
};

function NavIcon({ name }) {
  const props = { 'aria-hidden': true, className: 'h-5 w-5 shrink-0', fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 1.8, viewBox: '0 0 24 24' };
  if (name === 'route') return <svg {...props}><path d="M5 18c4-1 3-10 8-10 3 0 3 4 6 4" /><path d="m17 9 2 3-3 1" /><circle cx="5" cy="18" r="1.5" /><circle cx="13" cy="8" r="1.5" /></svg>;
  if (name === 'history') return <svg {...props}><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5M12 7v5l3 2" /></svg>;
  if (name === 'parcel') return <svg {...props}><path d="m4 7 8-4 8 4-8 4-8-4Z" /><path d="M4 7v10l8 4 8-4V7M12 11v10" /></svg>;
  if (name === 'check') return <svg {...props}><path d="m5 12 4 4L19 6" /><path d="M12 3a9 9 0 1 0 9 9" /></svg>;
  if (name === 'wallet') return <svg {...props}><path d="M4 7h15a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" /><path d="M3 8 16 4v4M16 14h5" /><circle cx="16" cy="14" r=".7" /></svg>;
  if (name === 'user') return <svg {...props}><circle cx="12" cy="8" r="3.5" /><path d="M5 21a7 7 0 0 1 14 0" /></svg>;
  return <svg {...props}><rect height="14" rx="1" width="14" x="5" y="5" /><path d="M9 9h.01M15 9h.01M9 15h.01M15 15h.01" /></svg>;
}

function MenuButton({ open, onClick }) {
  return <button aria-controls="app-navigation" aria-expanded={open} aria-label={open ? 'Close application menu' : 'Open application menu'} className="grid h-10 w-10 place-items-center rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 lg:hidden" onClick={onClick} type="button"><svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24"><path d={open ? 'm6 6 12 12M18 6 6 18' : 'M4 7h16M4 12h16M4 17h16'} /></svg></button>;
}

function RoleLabel({ role }) {
  return role ? `${role[0]}${role.slice(1).toLowerCase()}` : 'Account';
}

function NavItems({ mobile = false, onNavigate }) {
  const { user } = useAuth();
  const links = linksByRole[user?.role] || [];
  return <div className="space-y-1">{links.map((link) => <NavLink className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive ? 'bg-ryda-50 text-ryda-800' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-950'}`} key={link.to} onClick={onNavigate} to={link.to}><NavIcon name={link.icon} />{link.label}</NavLink>)}</div>;
}

function AccountSummary() {
  const { user } = useAuth();
  return <div className="border-t border-slate-200 pt-4"><p className="truncate text-sm font-semibold text-slate-900">{user?.fullName || 'RYDA account'}</p><p className="mt-0.5 text-xs text-slate-500">{RoleLabel({ role: user?.role })}</p></div>;
}

export function ApplicationSidebar() {
  return <aside aria-label="Application navigation" className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex"><div className="flex min-h-screen flex-col px-4 py-5"><NavLink aria-label="RYDA home" className="px-2" to="/"><BrandMark /></NavLink><p className="px-2 pb-4 pt-7 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Workspace</p><NavItems /><div className="mt-auto space-y-4 px-2"><AccountSummary /><LogoutButton className="w-full" /></div></div></aside>;
}

export function ApplicationTopBar() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur lg:hidden"><div className="flex min-h-16 items-center justify-between px-4 sm:px-6"><NavLink aria-label="RYDA home" to="/"><BrandMark /></NavLink><MenuButton onClick={() => setOpen((value) => !value)} open={open} /></div>{open && <nav aria-label="Application navigation" className="border-t border-slate-200 px-4 py-3 sm:px-6" id="app-navigation"><div className="pb-3"><p className="truncate text-sm font-semibold text-slate-900">{user?.fullName || 'RYDA account'}</p><p className="mt-0.5 text-xs text-slate-500"><RoleLabel role={user?.role} /></p></div><NavItems mobile onNavigate={close} /><div className="mt-3 border-t border-slate-200 pt-3"><LogoutButton className="w-full" /></div></nav>}</header>;
}
