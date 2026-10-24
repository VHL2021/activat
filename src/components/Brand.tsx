import type { ReactNode } from "react";

const asset = (name: string) => `${import.meta.env.BASE_URL}${name}`;

// Logo de Activa't. "full": círculo encima del nombre (portada). "row": círculo y nombre en línea (cabeceras).
export function Logo({ variant = "row", className = "" }: { variant?: "full" | "row" | "mark"; className?: string }) {
  if (variant === "full") return <img src={asset("logo.png")} alt="Activa't" className={className} />;
  if (variant === "mark") return <img src={asset("logo-circulo.png")} alt="Activa't" className={className} />;
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <img src={asset("logo-circulo.png")} alt="" className="h-[1.15em] w-auto" />
      <img src={asset("logo-texto.png")} alt="Activa't" className="h-[0.8em] w-auto" />
    </span>
  );
}

// Foto de la persona o, si no tiene, sus iniciales.
export function Avatar({ name, src, className = "size-9 text-sm" }: { name: string; src?: string | null; className?: string }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return src ? (
    <img src={src} alt={name} title={name} className={`shrink-0 rounded-full object-cover ${className}`} />
  ) : (
    <span title={name} aria-label={name} className={`inline-flex shrink-0 items-center justify-center rounded-full bg-sky-tint font-semibold text-sky-deep ${className}`}>
      {initials}
    </span>
  );
}

// Aforo de una clase: un punto por plaza (lleno = ocupada). Con muchas plazas, una barra.
export function CapacityMeter({ capacity, booked, tone = "dark" }: { capacity: number; booked: number; tone?: "dark" | "light" }) {
  const taken = Math.min(booked, capacity);
  const label = `${taken} de ${capacity} plazas ocupadas`;
  const full = tone === "dark" ? "bg-ink" : "bg-sand";
  const empty = tone === "dark" ? "border-sky bg-sky-tint" : "border-white/40";
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

export function PageHeader({ title, lead, children }: { title: string; lead?: ReactNode; children?: ReactNode }) {
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

// Iconos sencillos (trazo de 2 px, heredan el color del texto).
const PATHS = {
  left: "M15 18l-6-6 6-6",
  right: "M9 6l6 6-6 6",
  check: "M5 12.5l4.5 4.5L19 7.5",
  clock: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
  calendar: "M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  plus: "M12 5v14M5 12h14",
  x: "M6 6l12 12M18 6L6 18",
  camera: "M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
};

export function Icon({ name, className = "size-4" }: { name: keyof typeof PATHS; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}
