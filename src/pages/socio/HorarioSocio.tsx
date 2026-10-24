import { useState } from "react";
import { ErrorBox, Loading } from "../../components/ActionForm";
import { PageHeader } from "../../components/Brand";
import { addDays, formatDate, todayISO } from "../../lib/dates";
import { getSettings, must, rpc, supabase } from "../../lib/supabase";
import type { ClosedDay, MemberSession } from "../../lib/types";
import { useData } from "../../lib/useData";
import { SessionCard } from "./SessionCard";

const weekdayShort = (iso: string) =>
  new Intl.DateTimeFormat("es-ES", { weekday: "short", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`)).replace(".", "");

export function HorarioSocio() {
  const today = todayISO();
  const [picked, setPicked] = useState<string | null>(null);
  const { data, error, reload } = useData(async () => {
    const settings = await getSettings();
    const last = addDays(today, settings.max_days_ahead);
    await rpc("ensure_sessions", { p_from: today, p_to: last });
    const [sessions, closed] = await Promise.all([
      rpc<MemberSession[]>("member_sessions", { p_from: today, p_to: last }),
      must(supabase.from("closed_days").select().gte("day", today).lte("day", last)),
    ]);
    return { settings, sessions, closed: closed as ClosedDay[] };
  });

  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  const days = Array.from({ length: data.settings.max_days_ahead + 1 }, (_, i) => addDays(today, i))
    .filter((day) => data.sessions.some((s) => s.day === day) || data.closed.some((c) => c.day === day));
  const day = picked && days.includes(picked) ? picked : days[0];
  const sessions = data.sessions.filter((s) => s.day === day);
  const closed = data.closed.find((c) => c.day === day);

  return (
    <div className="space-y-6">
      <PageHeader title="Horario" lead={`Puedes reservar con hasta ${data.settings.max_days_ahead} días de antelación.`} />

      {days.length === 0 ? (
        <p className="notice">No hay clases programadas en los próximos días.</p>
      ) : (
        <>
          {/* Tira de días: se elige uno y debajo salen sus clases. */}
          <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1" role="tablist" aria-label="Días">
            {days.map((d) => {
              const mine = data.sessions.some((s) => s.day === d && s.my_status && !s.cancelled);
              const shut = data.closed.some((c) => c.day === d);
              const active = d === day;
              return (
                <button
                  key={d}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setPicked(d)}
                  className={`relative flex w-16 shrink-0 snap-start flex-col items-center rounded-2xl border py-2.5 transition-colors ${
                    active ? "border-ink bg-ink text-white" : "border-line bg-surface hover:border-ink"
                  } ${shut && !active ? "text-faint" : ""}`}
                >
                  <span className={`text-xs font-semibold capitalize ${active ? "text-white/70" : "text-muted"}`}>
                    {d === today ? "Hoy" : weekdayShort(d)}
                  </span>
                  <span className="time text-[1.75rem] leading-none">{Number(d.slice(8))}</span>
                  <span className={`mt-1 size-1.5 rounded-full ${mine ? "bg-brand" : "bg-transparent"}`} />
                  {mine && <span className="sr-only">Tienes reserva</span>}
                </button>
              );
            })}
          </div>

          <section role="tabpanel" aria-label={formatDate(day)}>
            <h2 className="section-title mb-3">{day === today ? "Hoy, " + formatDate(day).toLowerCase() : formatDate(day)}</h2>
            {closed ? (
              <p className="notice-warn">Gimnasio cerrado{closed.reason ? `: ${closed.reason}` : ""}</p>
            ) : (
              <ul className="space-y-3">
                {sessions.map((s) => <SessionCard key={s.id} s={s} settings={data.settings} onChange={reload} />)}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
