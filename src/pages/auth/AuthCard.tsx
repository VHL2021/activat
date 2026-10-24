import type { ReactNode } from "react";
import { Logo } from "../../components/Brand";

export function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="grid min-h-screen md:grid-cols-[1.1fr_1fr]">
      <section className="flex flex-col justify-between gap-8 bg-ink px-6 pt-8 pb-10 text-white md:px-14 md:py-14">
        <Logo tone="light" className="text-3xl" />
        <div>
          <p className="font-display text-[clamp(3.25rem,9vw,7.5rem)] leading-[0.85] font-black tracking-tight">
            Tu plaza,<br />reservada.
          </p>
          <p className="mt-5 max-w-sm text-white/70">Mira el horario, apúntate a tus clases y desapúntate si no puedes ir.</p>
        </div>
      </section>
      <section className="flex items-start justify-center px-6 py-10 md:items-center md:px-10">
        <div className="w-full max-w-sm">
          <h1 className="mb-6 font-display text-4xl leading-none font-extrabold tracking-tight">{title}</h1>
          {children}
        </div>
      </section>
    </main>
  );
}
