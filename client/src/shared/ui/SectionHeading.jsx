export default function SectionHeading({ eyebrow, title, description, as: Heading = 'h2', className = '' }) {
  return (
    <header className={className}>
      {eyebrow && <p className="text-sm font-bold uppercase tracking-[0.14em] text-ryda-700">{eyebrow}</p>}
      <Heading className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{title}</Heading>
      {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">{description}</p>}
    </header>
  );
}
