import { Link } from 'react-router-dom';
import { BrandMark } from '../shared/ui';

const footerGroups = [
  { title: 'Explore', links: [{ to: '/about', label: 'About RYDA' }, { to: '/how-it-works', label: 'How it works' }, { to: '/safety', label: 'Safety' }] },
  { title: 'Support', links: [{ to: '/help', label: 'Help & FAQ' }, { to: '/register', label: 'Create an account' }, { to: '/login', label: 'Log in' }] },
  { title: 'Legal', links: [{ to: '/privacy', label: 'Privacy' }, { to: '/terms', label: 'Terms of use' }] }
];

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="page-container py-10 sm:py-12">
        <div className="grid gap-9 sm:grid-cols-2 lg:grid-cols-[1.35fr_repeat(3,1fr)] lg:gap-8">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link aria-label="RYDA home" to="/"><BrandMark /></Link>
            <p className="mt-4 max-w-xs text-sm leading-6 text-slate-600">Campus Keke rides and point-to-point package or document delivery.</p>
          </div>
          {footerGroups.map((group) => (
            <div key={group.title}>
              <h2 className="text-sm font-semibold text-slate-950">{group.title}</h2>
              <ul className="mt-3 space-y-2">
                {group.links.map((link) => <li key={link.to}><Link className="text-sm text-slate-600 transition-colors hover:text-ryda-800" to={link.to}>{link.label}</Link></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-9 border-t border-slate-200 pt-5 text-xs text-slate-500">© {new Date().getFullYear()} RYDA. Campus mobility MVP.</div>
      </div>
    </footer>
  );
}
