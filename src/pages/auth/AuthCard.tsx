import type { ReactNode } from "react";
import { Logo } from "../../components/Brand";

export function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="grid min-h-screen md:grid-cols-[1.1fr_1fr]">
      <section className="relative flex flex-col items-center justify-center gap-6 overflow-hidden bg-ink px-6 pt-10 pb-12 text-center text-white md:gap-10 md:px-14">
        {/* Círculo grande del logo, de fondo, recortado por el borde. */}
        <span aria-hidden="true" className="absolute -right-24 -bottom-24 size-72 rounded-full bg-sky/10 md:size-[28rem]" />
        <Logo variant="full" className="relative w-48 md:w-80" />
        <div className="relative">
          <p className="font-display text-4xl leading-tight font-black md:text-6xl">Tu plaza, reservada.</p>
          <p className="mx-auto mt-3 max-w-sm text-white/70">Mira el horario, apúntate a tus clases y desapúntate si no puedes ir.</p>
        </div>
      </section>
      <section className="flex items-start justify-center px-6 py-10 md:items-center md:px-10">
        <div className="w-full max-w-sm">
          <h1 className="mb-6 font-display text-4xl leading-none font-black tracking-tight">{title}</h1>
          {children}
        </div>
      </section>
    </main>
  );
}
