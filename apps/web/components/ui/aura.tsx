export function Aura({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] overflow-hidden ${className}`}
    >
      <div
        className="absolute left-1/2 top-[-280px] size-[620px] -translate-x-1/2 rounded-full blur-[110px]"
        style={{
          background:
            "radial-gradient(circle, rgba(88,101,242,var(--aura-strength)) 0%, rgba(88,101,242,0) 70%)",
        }}
      />
      <div
        className="absolute right-[8%] top-[40px] size-[240px] rounded-full blur-[90px]"
        style={{
          background:
            "radial-gradient(circle, rgba(235,69,158,calc(var(--aura-strength) * 0.55)) 0%, rgba(235,69,158,0) 70%)",
        }}
      />
    </div>
  );
}
