import { Link } from 'react-router-dom';
import { SectionHeading } from '../../shared/ui';

const paymentWarning = 'For your safety and transaction traceability, make payments only through RYDA. Payments made outside RYDA cannot be verified through our platform and are not covered by RYDA payment records or dispute support.';

function PageIntro({ eyebrow, title, description, children }) {
  return (
    <article className="mx-auto max-w-3xl space-y-10 pb-6 sm:pb-10">
      <SectionHeading as="h1" description={description} eyebrow={eyebrow} title={title} />
      {children}
    </article>
  );
}

function ContentSection({ title, children }) {
  return (
    <section className="border-t border-slate-200 pt-7">
      <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-slate-700">{children}</div>
    </section>
  );
}

function BulletList({ children }) {
  return <ul className="space-y-2 pl-5 marker:text-ryda-700">{children}</ul>;
}

export function AboutPage() {
  return (
    <PageIntro description="RYDA is a focused campus mobility MVP for Keke rides and point-to-point package or document delivery." eyebrow="About RYDA" title="Built around everyday campus movement.">
      <ContentSection title="What RYDA supports">
        <p>RYDA brings two common campus needs into one web application: booking one to four seats in a Keke and arranging a simple delivery within the same campus.</p>
        <BulletList>
          <li>Campus Keke rides at a fixed ₦150 per seat.</li>
          <li>Private Keke bookings when all four seats are selected.</li>
          <li>Point-to-point campus delivery for an existing package or document at a fixed ₦150 fare.</li>
        </BulletList>
      </ContentSection>
      <ContentSection title="How the MVP is designed">
        <p>RYDA uses authenticated accounts, a driver verification workflow, in-platform payment records, and active-service tracking where available. It is intentionally limited to a single-campus operating model for the MVP.</p>
      </ContentSection>
      <Link className="inline-flex rounded-lg bg-ryda-700 px-5 py-3 text-sm font-semibold text-white hover:bg-ryda-800" to="/register">Get started with RYDA</Link>
    </PageIntro>
  );
}

export function HowItWorksPage() {
  return (
    <PageIntro description="RYDA keeps campus rides and deliveries straightforward, with clear service details from request through completion." eyebrow="How it works" title="Two practical services, one campus platform.">
      <ContentSection title="Campus Keke rides">
        <ol className="space-y-3">
          <li><strong className="text-slate-950">1. Add your route.</strong> Enter your pickup point and destination.</li>
          <li><strong className="text-slate-950">2. Choose one to four seats.</strong> The fixed fare is ₦150 per seat; booking all four seats is a Private Keke booking.</li>
          <li><strong className="text-slate-950">3. Follow an accepted ride.</strong> After a driver accepts, the active ride can be tracked through the app.</li>
        </ol>
      </ContentSection>
      <ContentSection title="Campus courier">
        <ol className="space-y-3">
          <li><strong className="text-slate-950">1. Set pickup and drop-off locations.</strong> Add the campus addresses and coordinates for the delivery.</li>
          <li><strong className="text-slate-950">2. Add recipient and package information.</strong> Describe the existing package or document being sent.</li>
          <li><strong className="text-slate-950">3. Track delivery progress.</strong> Follow the delivery as it moves through its active stages where tracking is available.</li>
        </ol>
        <p>The MVP courier fare is a fixed ₦150.</p>
      </ContentSection>
      <ContentSection title="Payments">
        <p>{paymentWarning}</p>
      </ContentSection>
    </PageIntro>
  );
}

export function SafetyPage() {
  return (
    <PageIntro description="Use the app’s verified workflows and make decisions that keep your campus trip or delivery clear and traceable." eyebrow="Safety" title="Make every campus trip more accountable.">
      <ContentSection title="Use verified workflows">
        <BulletList>
          <li>Drivers go through the RYDA driver verification workflow before they can operate on the platform.</li>
          <li>Use authenticated RYDA accounts for your ride and courier requests.</li>
          <li>Keep payments within RYDA so the transaction record can be checked in the platform.</li>
        </BulletList>
      </ContentSection>
      <ContentSection title="Follow active service">
        <p>Live driver location is available during active rides and may be available while a courier delivery is in transit. Check the details shown in your active booking or delivery and use the platform record when you need to review the service.</p>
      </ContentSection>
      <ContentSection title="Use campus common sense">
        <BulletList>
          <li>Confirm your pickup, destination, and recipient details before submitting a request.</li>
          <li>Use well-known campus pickup points and stay aware of your surroundings.</li>
          <li>For an emergency or immediate safety concern, contact the relevant campus emergency or security service directly.</li>
        </BulletList>
        <p>RYDA does not guarantee safety or provide emergency response.</p>
      </ContentSection>
      <aside className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950"><strong>Payment reminder:</strong> {paymentWarning}</aside>
    </PageIntro>
  );
}

const faqs = [
  ['How many seats can I book?', 'You can book one, two, three, or four seats in a Keke.'],
  ['What is a Private Keke?', 'Selecting all four seats is treated as a Private Keke booking. At ₦150 per seat, the fare is ₦600.'],
  ['What can I send through courier?', 'The MVP supports an existing package or document for point-to-point delivery within the same campus.'],
  ['How much is courier delivery?', 'The MVP courier fare is fixed at ₦150.'],
  ['How should I pay?', paymentWarning],
  ['How does driver verification work?', 'Drivers submit their Keke and identity details for review before they can operate as verified drivers.'],
  ['Can I track a ride or delivery?', 'An accepted ride can be tracked during active service. Courier tracking may be available while the delivery is in transit.'],
  ['What happens if a job is cancelled?', 'Cancellation availability depends on the current service stage. Check the active ride or courier request in the app for its current status.'],
  ['How do I update my account details?', 'Sign in and open Profile to update the profile information available in the app.']
];

export function HelpPage() {
  return (
    <PageIntro description="Helpful answers for booking rides, arranging deliveries, payments, verification, and account details." eyebrow="Help" title="Questions about using RYDA?">
      <section className="space-y-3">
        {faqs.map(([question, answer]) => (
          <details key={question} className="app-card group px-5 py-4">
            <summary className="cursor-pointer list-none pr-8 font-semibold text-slate-950 marker:hidden">{question}<span aria-hidden="true" className="float-right text-ryda-700 transition-transform group-open:rotate-45">+</span></summary>
            <p className="mt-3 border-t border-slate-100 pt-3 text-sm leading-7 text-slate-700">{answer}</p>
          </details>
        ))}
      </section>
      <p className="rounded-xl bg-slate-100 p-5 text-sm leading-6 text-slate-700">Contact the RYDA team through the support channel provided by your campus/project administrator.</p>
    </PageIntro>
  );
}

export function PrivacyPage() {
  return (
    <PageIntro description="This page explains the MVP information that RYDA needs to provide and support campus ride and courier services." eyebrow="Privacy" title="How RYDA handles service information.">
      <ContentSection title="Information used in the MVP">
        <BulletList>
          <li>Account and profile information, including name, contact details, role, and profile image where supplied.</li>
          <li>Driver verification details, including vehicle and identity-document information stored through the configured media service.</li>
          <li>Ride and courier booking details, such as pickup, destination or drop-off, recipient, package description, and service status.</li>
          <li>Location information while active ride or courier tracking is in use.</li>
          <li>Payment references, transaction status, and driver wallet or fee records used by the MVP.</li>
          <li>Service and security logs needed to operate, troubleshoot, and protect the application.</li>
        </BulletList>
      </ContentSection>
      <ContentSection title="How it is used">
        <p>RYDA uses this information to create and manage requests, verify drivers, show active service tracking, maintain payment records, support user accounts, and investigate service issues. The project does not claim a specific legal certification or compliance status through this MVP page.</p>
      </ContentSection>
      <ContentSection title="Your account">
        <p>Keep your account information accurate and protect your login credentials. You can review the profile fields available to you in the app after signing in.</p>
      </ContentSection>
    </PageIntro>
  );
}

export function TermsPage() {
  return (
    <PageIntro description="These MVP terms set practical expectations for using RYDA’s campus ride and courier features." eyebrow="Terms of use" title="Using RYDA responsibly.">
      <ContentSection title="The service">
        <p>RYDA is a single-campus MVP for Keke rides and point-to-point package or document delivery. Availability can depend on verified drivers, driver status, campus conditions, and the operational state of the application.</p>
      </ContentSection>
      <ContentSection title="Accounts and requests">
        <BulletList>
          <li>Provide accurate information when registering, booking a ride, or requesting a delivery.</li>
          <li>Keep account credentials private and do not use another person’s account.</li>
          <li>Riders and senders are responsible for confirming pickup, destination, drop-off, recipient, and package details.</li>
          <li>Drivers are responsible for following the verification and service workflows provided in the app.</li>
        </BulletList>
      </ContentSection>
      <ContentSection title="Payments and cancellations">
        <p>{paymentWarning}</p>
        <p>Payment records, cancellation availability, and service status are managed through the active service workflow. Do not use RYDA for prohibited, unsafe, or unlawful activity.</p>
      </ContentSection>
      <ContentSection title="MVP limitations">
        <p>RYDA is provided as an MVP for demonstration and learning. The service may be unavailable, changed, or limited. Nothing on this page creates a guarantee of continuous availability, transport outcome, delivery outcome, or emergency response.</p>
      </ContentSection>
    </PageIntro>
  );
}
