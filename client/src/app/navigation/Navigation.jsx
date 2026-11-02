import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { LogoutButton, useAuth } from '../../features/identity';
import { BrandMark } from '../../shared/ui';

const publicLinks = [
  { to: '/', label: 'Home' },
  { to: '/how-it-works', label: 'How it works' },
  { to: '/safety', label: 'Safety' },
  { to: '/help', label: 'Help' }
];

const roleLinks = {
  RIDER: [
    { to: '/rides', label: 'Book a ride' },
    { to: '/rides/history', label: 'Ride history' },
    { to: '/courier', label: 'Courier' }
  ],
  DRIVER: [
    { to: '/driver', label: 'Driver dashboard' },
    { to: '/driver-verification', label: 'Verification' },
    { to: '/payments', label: 'Wallet' }
  ],
  ADMIN: [{ to: '/admin', label: 'Admin dashboard' }]
};

function MenuIcon({ open }) {
  return open ? (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  ) : (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function AppNavLink({ link, onNavigate, mobile = false }) {
  return (
    <NavLink
      end={link.to === '/'}
      onClick={onNavigate}
      to={link.to}
      className={({ isActive }) => `${mobile ? 'block rounded-lg px-3 py-2.5' : 'py-2'} text-sm font-medium transition-colors ${isActive ? 'bg-ryda-50 text-ryda-800' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-950'}`}
    >
      {link.label}
    </NavLink>
  );
}

function PublicNavLink({ link, onNavigate, mobile = false }) {
  return (
    <Link
      className={`${mobile ? 'block rounded-lg px-3 py-2.5' : 'py-2'} text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-950`}
      onClick={onNavigate}
      to={link.to}
    >
      {link.label}
    </Link>
  );
}

export default function Navigation() {
  const { user, isAuthenticated } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const links = isAuthenticated ? (roleLinks[user?.role] || []) : publicLinks;
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
      <nav aria-label="Main navigation" className="page-container" onKeyDown={(event) => event.key === 'Escape' && closeMenu()}>
        <div className="flex min-h-16 items-center justify-between gap-3 py-3">
          <NavLink aria-label="RYDA home" className="shrink-0" onClick={closeMenu} to="/">
            <BrandMark />
          </NavLink>

          <div className="hidden items-center gap-1 lg:flex">
            {isAuthenticated
              ? links.map((link) => <AppNavLink key={link.to} link={link} />)
              : links.map((link) => <PublicNavLink key={link.to} link={link} />)}
          </div>

          <div className="hidden items-center gap-2 lg:flex">
            {isAuthenticated ? (
              <>
                <NavLink className={({ isActive }) => `max-w-40 truncate rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-ryda-50 text-ryda-800' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-950'}`} to="/profile">{user?.fullName || 'Profile'}</NavLink>
                <LogoutButton />
              </>
            ) : (
              <>
                <NavLink className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-950" to="/login">Log in</NavLink>
                <NavLink className="rounded-lg bg-ryda-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-ryda-800" to="/register">Get started</NavLink>
              </>
            )}
          </div>

          <button
            aria-controls="mobile-navigation"
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="grid h-10 w-10 place-items-center rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 lg:hidden"
            onClick={() => setIsMenuOpen((open) => !open)}
            type="button"
          >
            <MenuIcon open={isMenuOpen} />
          </button>
        </div>

        {isMenuOpen && (
          <div className="border-t border-slate-200 py-3 lg:hidden" id="mobile-navigation">
            <div className="grid gap-1">
              {isAuthenticated
                ? links.map((link) => <AppNavLink key={link.to} link={link} mobile onNavigate={closeMenu} />)
                : links.map((link) => <PublicNavLink key={link.to} link={link} mobile onNavigate={closeMenu} />)}
              {isAuthenticated ? (
                <>
                  <AppNavLink link={{ to: '/profile', label: 'Profile' }} mobile onNavigate={closeMenu} />
                  <div className="mt-2 border-t border-slate-200 pt-3"><LogoutButton className="w-full" /></div>
                </>
              ) : (
                <div className="mt-2 grid grid-cols-2 gap-3 border-t border-slate-200 pt-3">
                  <NavLink className="rounded-lg border border-slate-300 px-3 py-2.5 text-center text-sm font-semibold text-slate-800 hover:bg-slate-50" onClick={closeMenu} to="/login">Log in</NavLink>
                  <NavLink className="rounded-lg bg-ryda-700 px-3 py-2.5 text-center text-sm font-semibold text-white hover:bg-ryda-800" onClick={closeMenu} to="/register">Get started</NavLink>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
