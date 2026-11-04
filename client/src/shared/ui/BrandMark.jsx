export default function BrandMark({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <img alt="" className="h-8 w-8 object-contain" src="/ryda_logo.png" />
      <span className="text-base font-extrabold tracking-[0.12em] text-slate-950">RYDA</span>
    </span>
  );
}
