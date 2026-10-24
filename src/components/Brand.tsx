// Marca de Activat: un interruptor encendido junto al nombre.
export function Logo({ className = "", tone = "dark" }: { className?: string; tone?: "dark" | "light" }) {
  const ink = tone === "dark" ? "var(--color-ink)" : "#fff";
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 34 20" className="h-[0.8em] w-auto" aria-hidden="true">
        <rect x="1.5" y="1.5" width="31" height="17" rx="8.5" fill="none" stroke={ink} strokeWidth="3" />
        <circle cx="23.5" cy="10" r="5.5" fill="var(--color-brand)" />
      </svg>
      <span className="font-display leading-none font-black tracking-tight" style={{ color: ink }}>activat</span>
    </span>
  );
}

// Aforo de una clase: un punto por plaza (lleno = ocupada). Con muchas plazas, una barra.
export function CapacityMeter({ capacity, booked, tone = "dark" }: { capacity: number; booked: number; tone?: "dark" | "light" }) {
  const taken = Math.min(booked, capacity);
  const label = `${taken} de ${capacity} plazas ocupadas`;
  const full = tone === "dark" ? "bg-ink" : "bg-white";
  const empty = tone === "dark" ? "border-brand bg-brand-tint" : "border-white/50";
  if (capacity > 24) {
    return (
      <span role="img" aria-label={label} className={`block h-2 w-full max-w-48 overflow-hidden rounded-full border ${empty}`}>
        <span className={`block h-full ${full}`} style={{ width: `${(taken / capacity) * 100}%` }} />
      </span>
    );
  }
  return (
    <span role="img" aria-label={label} className="flex flex-wrap gap-1">
      {Array.from({ length: capacity }, (_, i) => (
        <span key={i} className={`size-2.5 rounded-full border-2 ${i < taken ? `${full} border-transparent` : empty}`} />
      ))}
    </span>
  );
}

export function PageHeader({ title, lead, children }: { title: string; lead?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="page-title">{title}</h1>
        {lead && <p className="page-lead">{lead}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}
