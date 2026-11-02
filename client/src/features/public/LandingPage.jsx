import { Link } from 'react-router-dom';
import { BrandMark, SectionHeading } from '../../shared/ui';
import { RYDA_CONFIG } from '../../shared/constants/rydaConfig';

const paymentWarning = 'For your safety and transaction traceability, make payments only through RYDA. Payments made outside RYDA cannot be verified through our platform and are not covered by RYDA payment records or dispute support.';

const serviceCards = [
  {
    icon: 'route',
    title: 'Campus Keke rides',
    description: 'Request a Keke for your campus trip, choose the seats you need, and follow the ride once a driver accepts.'
  },
  {
    icon: 'parcel',
    title: 'Package & document delivery',
    description: 'Send an existing package or document between campus locations with clear pickup and drop-off details.'
  }
];

function Icon({ name, className = '' }) {
  const common = { className, fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 1.8, viewBox: '0 0 24 24', 'aria-hidden': true };

  if (name === 'route') {
    return <svg {...common}><path d="M5 18c4-1 3-10 8-10 3 0 3 4 6 4" /><path d="M17 9l2 3-3 1" /><circle cx="5" cy="18" r="1.5" /><circle cx="13" cy="8" r="1.5" /></svg>;
  }
  if (name === 'parcel') {
    return <svg {...common}><path d="m4 7 8-4 8 4-8 4-8-4Z" /><path d="M4 7v10l8 4 8-4V7" /><path d="M12 11v10" /></svg>;
  }
  if (name === 'pin') {
    return <svg {...common}><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2.5" /></svg>;
  }
  if (name === 'seats') {
    return <svg {...common}><path d="M7 11V7a3 3 0 0 1 6 0v4" /><path d="M5 19v-4a4 4 0 0 1 8 0v4" /><path d="M3 19h12" /><path d="M17 5v14" /><path d="M21 9v10" /></svg>;
  }
  if (name === 'track') {
    return <svg {...common}><path d="M12 21a9 9 0 1 0-9-9" /><path d="M12 7v5l3 2" /><path d="M3 16v5h5" /></svg>;
  }
  if (name === 'check') {
    return <svg {...common}><path d="m5 12 4 4L19 6" /></svg>;
  }
  return <svg {...common}><circle cx="12" cy="12" r="8" /></svg>;
}

function KekeIllustration() {
  return (
    <svg aria-label="Illustration of a campus Keke beside a route" className="h-auto w-full max-w-xl" role="img" viewBox="0 0 560 410">
      <path d="M34 314c85-65 110-3 181-55 60-44 90-109 161-65 54 34 81 10 150-48" fill="none" stroke="#99ded3" strokeDasharray="7 10" strokeWidth="4" />
      <path d="M31 346h491" stroke="#d8dedb" strokeWidth="3" />
      <path d="M77 343v-38M141 343v-21M444 343v-50M493 343v-27" stroke="#d8dedb" strokeWidth="3" />
      <circle cx="79" cy="291" fill="#e8f7f4" r="24" /><path d="M79 280a8 8 0 0 0-8 8c0 6 8 14 8 14s8-8 8-14a8 8 0 0 0-8-8Z" fill="#09665d" /><circle cx="79" cy="288" fill="#e8f7f4" r="2.5" />
      <circle cx="461" cy="266" fill="#e8f7f4" r="24" /><path d="M461 255a8 8 0 0 0-8 8c0 6 8 14 8 14s8-8 8-14a8 8 0 0 0-8-8Z" fill="#09665d" /><circle cx="461" cy="263" fill="#e8f7f4" r="2.5" />
      <path d="M175 274h201l-18-107H202l-27 72Z" fill="#f4c644" /><path d="M202 167h156l-12-54H226Z" fill="#09665d" />
      <path d="M225 183h49v58h-75l26-58ZM287 183h56l14 58h-70v-58Z" fill="#d9f3ef" />
      <path d="M175 239h201v45H175Z" fill="#e6a82f" /><path d="M190 253h161" stroke="#fff1bd" strokeWidth="4" />
      <path d="M205 208h38M302 208h28" stroke="#09665d" strokeWidth="4" />
      <path d="M177 284h201" stroke="#172033" strokeWidth="8" /><circle cx="224" cy="288" fill="#172033" r="31" /><circle cx="224" cy="288" fill="#f7f8f7" r="12" /><circle cx="332" cy="288" fill="#172033" r="31" /><circle cx="332" cy="288" fill="#f7f8f7" r="12" />
      <path d="M160 273h31M376 273h23" stroke="#172033" strokeWidth="7" strokeLinecap="round" />
      <rect fill="#f7f8f7" height="19" rx="4" width="77" x="237" y="214" /><text fill="#09665d" fontFamily="system-ui, sans-serif" fontSize="12" fontWeight="800" letterSpacing="2" textAnchor="middle" x="276" y="228">RYDA</text>
      <path d="M412 141v71M395 158h34M401 141l11-20 11 20" fill="none" stroke="#a8b5b1" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M112 157v80M95 177h34M101 157l11-20 11 20" fill="none" stroke="#a8b5b1" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Step({ number, icon, title, children }) {
  return (
    <li className="relative grid grid-cols-[auto_1fr] gap-x-4 pb-7 last:pb-0 sm:block sm:pb-0">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-ryda-100 text-sm font-bold text-ryda-800 sm:mb-4">{number}</span>
      <div>
        <Icon className="mb-3 hidden h-6 w-6 text-ryda-700 sm:block" name={icon} />
        <h3 className="font-semibold text-slate-950">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">{children}</p>
      </div>
    </li>
  );
}

export default function LandingPage() {
  const rideFare = `₦${RYDA_CONFIG.RIDE_FARE_PER_SEAT_NGN}`;
  const courierFare = `₦${RYDA_CONFIG.COURIER_FARE_NGN}`;

  return (
    <div className="space-y-16 pb-6 sm:space-y-20 sm:pb-10">
      <section className="grid items-center gap-10 pt-3 lg:grid-cols-[1.02fr_0.98fr] lg:gap-14 lg:pt-8">
        <div>
          <BrandMark className="mb-6" />
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-ryda-700">Campus mobility, made practical</p>
          <h1 className="mt-3 max-w-xl text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">Rides and delivery that move with campus.</h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-slate-600 sm:text-lg">Book a Keke when you need to get across campus, or send a package or document to the right place.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link className="rounded-lg bg-ryda-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-ryda-800" to="/register">Get started</Link>
            <Link className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition-colors hover:border-slate-400 hover:bg-slate-50" to="/courier">Send a package</Link>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-[#d5e8e4] bg-[#eaf7f4] px-5 py-7 sm:px-8 sm:py-10">
          <div aria-hidden="true" className="absolute inset-x-8 top-8 h-24 rounded-full bg-white/60 blur-2xl" />
          <KekeIllustration />
          <p className="relative mt-1 text-center text-sm font-medium text-ryda-800">A simple way to move around campus</p>
        </div>
      </section>

      <section aria-label="RYDA services">
        <SectionHeading description="Two focused services for everyday campus movement." eyebrow="What RYDA does" title="Move yourself, or move what matters." />
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {serviceCards.map((service) => (
            <article key={service.title} className="app-card p-6 sm:p-7">
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-ryda-50 text-ryda-700"><Icon className="h-6 w-6" name={service.icon} /></span>
              <h3 className="mt-5 text-xl font-semibold text-slate-950">{service.title}</h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">{service.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-10 border-y border-slate-200 py-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:gap-16 lg:py-16" id="how-it-works">
        <SectionHeading description={`${rideFare} per seat, with up to four seats available in one booking.`} eyebrow="Campus rides" title="A Keke trip in three clear steps." />
        <ol className="grid gap-4 sm:grid-cols-3 sm:gap-6">
          <Step icon="pin" number="01" title="Set your route">Enter your pickup and destination on campus.</Step>
          <Step icon="seats" number="02" title="Choose your seats">Book one to four seats. Four seats means a Private Keke.</Step>
          <Step icon="track" number="03" title="Follow the ride">Track the accepted ride as your driver approaches and travels.</Step>
        </ol>
      </section>

      <section className="grid gap-8 rounded-2xl bg-slate-950 px-6 py-8 text-white sm:px-9 sm:py-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#82d8cc]">Campus courier</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">A direct route for your package or document.</h2>
          <p className="mt-4 max-w-md text-sm leading-6 text-slate-300">Courier delivery has a fixed {courierFare} MVP fare for a point-to-point campus delivery.</p>
          <Link className="mt-6 inline-flex rounded-lg bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-ryda-100" to="/courier">Create a courier request</Link>
        </div>
        <ol className="grid gap-5 sm:grid-cols-3 sm:gap-4">
          <li><span className="text-sm font-bold text-[#82d8cc]">01</span><h3 className="mt-3 font-semibold">Set locations</h3><p className="mt-2 text-sm leading-6 text-slate-300">Add the pickup and drop-off address.</p></li>
          <li><span className="text-sm font-bold text-[#82d8cc]">02</span><h3 className="mt-3 font-semibold">Add delivery details</h3><p className="mt-2 text-sm leading-6 text-slate-300">Include recipient and package information.</p></li>
          <li><span className="text-sm font-bold text-[#82d8cc]">03</span><h3 className="mt-3 font-semibold">Track progress</h3><p className="mt-2 text-sm leading-6 text-slate-300">Follow the delivery while it is in transit where tracking is available.</p></li>
        </ol>
      </section>

      <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center" id="safety">
        <div>
          <SectionHeading description="RYDA keeps the important parts of a campus trip or delivery visible in one place." eyebrow="Use the platform" title="Designed for accountable campus movement." />
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {['Authenticated accounts for riders and drivers.', 'Driver verification before drivers can operate.', 'Live trip or delivery tracking during active service where available.', 'In-platform payment records for supported transactions.'].map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-6 text-slate-700"><Icon className="mt-0.5 h-5 w-5 shrink-0 text-ryda-700" name="check" />{item}</li>
            ))}
          </ul>
        </div>
        <aside className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm leading-6 text-amber-950">
          <p className="font-semibold">Keep payments in RYDA</p>
          <p className="mt-2">{paymentWarning}</p>
        </aside>
      </section>

      <section className="app-card grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-ryda-700">For drivers</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Ready to drive on campus?</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">Verified drivers can receive campus ride and courier requests when they are approved and available.</p>
        </div>
        <Link className="w-fit rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-800 transition-colors hover:border-ryda-700 hover:text-ryda-800" to="/register">Register as a driver</Link>
      </section>

      <section className="rounded-2xl bg-ryda-700 px-6 py-9 text-center text-white sm:px-10 sm:py-12">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Start your next campus trip with RYDA.</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-ryda-100 sm:text-base">Create an account to request a ride, arrange a delivery, or begin the driver verification process.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-ryda-800 transition-colors hover:bg-ryda-50" to="/register">Create an account</Link>
          <Link className="rounded-lg border border-ryda-100 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-ryda-800" to="/login">Log in</Link>
        </div>
      </section>
    </div>
  );
}
