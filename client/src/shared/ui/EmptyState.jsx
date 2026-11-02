export default function EmptyState({ title, description, action, className = '' }) {
  return (
    <section className={`app-card border-dashed p-6 text-center sm:p-8 ${className}`.trim()}>
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      {description && <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </section>
  );
}
