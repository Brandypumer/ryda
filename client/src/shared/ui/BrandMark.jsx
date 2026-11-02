export default function BrandMark({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-lg bg-ryda-700 text-sm font-black text-white shadow-sm">
        R
      </span>
      <span className="text-base font-extrabold tracking-[0.12em] text-slate-950">RYDA</span>
    </span>
  );
}
