import { useState } from "react";
import { ErrorBox, Loading } from "../../components/ActionForm";
import { Icon } from "../../components/Brand";
import { addDays, dayNumber, formatDate, formatTime, mondayOf, todayISO, WEEKDAY_LETTERS } from "../../lib/dates";
import { getSettings, must, rpc, supabase } from "../../lib/supabase";
import type { ClosedDay, MemberSession } from "../../lib/types";
import { useData } from "../../lib/useData";
import { SessionCard } from "./SessionCard";

// Reservar: se elige el día en la semana y debajo salen sus clases, con botones para saltar a cada hora.
export function HorarioSocio() {
  const today = todayISO();
  const [picked, setDay] = useState<string | null>(null);
  const { data, error, reload } = useData(async () => {
    const settings = await getSettings();
    const last = addDays(today, settings.max_days_ahead);
    await rpc("ensure_sessions", { p_from: today, p_to: last });
    const [sessions, closed] = await Promise.all([
      rpc<MemberSession[]>("member_sessions", { p_from: today, p_to: last }),
      must(supabase.from("closed_days").select().gte("day", today).lte("day", last)),
    ]);
    return { settings, sessions, closed: closed as ClosedDay[], last };
  });

  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  // Al entrar se abre hoy o, si hoy ya no quedan clases, el primer día que tenga.
  const day = picked ?? (data.sessions.some((s) => s.day === today) ? today : data.sessions[0]?.day ?? today);
  const monday = mondayOf(day);
  const week = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const sessions = data.sessions.filter((s) => s.day === day);
  const closed = data.closed.find((c) => c.day === day);
  const label = formatDate(day, { weekday: "long", day: "2-digit", month: "2-digit" }).replace(",", "");

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-full bg-sky-tint text-sky-deep"><Icon name="calendar" className="size-5" /></span>
        <div>
          <p className="text-xs font-semibold text-muted">Día</p>
          <h1 className="font-display text-2xl leading-tight font-black">{day === today ? `Hoy, ${label.toLowerCase()}` : label}</h1>
        </div>
      </div>

      {/* Semana: flechas para cambiar de semana dentro del plazo de reserva. */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button type="button" className="icon-btn shrink-0" aria-label="Semana anterior" disabled={monday <= today} onClick={() => setDay(addDays(monday, -7) < today ? today : addDays(monday, -7))}>
          <Icon name="left" />
        </button>
        <div className="grid flex-1 grid-cols-7 gap-1 sm:gap-2" role="tablist" aria-label="Días de la semana">
          {week.map((d, i) => {
            const out = d < today || d > data.last;
            const mine = data.sessions.some((s) => s.day === d && s.my_status && !s.cancelled);
            const active = d === day;
            return (
              <button
                key={d}
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={formatDate(d)}
                disabled={out}
                onClick={() => setDay(d)}
                className={`flex flex-col items-center rounded-xl py-1.5 transition-colors disabled:opacity-35 ${
                  active ? "bg-sand text-ink" : "bg-surface hover:bg-sky-tint"
                }`}
              >
                <span className={`text-[11px] font-semibold ${active ? "" : "text-muted"}`}>{WEEKDAY_LETTERS[i]}</span>
                <span className="time text-xl leading-tight sm:text-2xl">{dayNumber(d)}</span>
                <span className={`size-1.5 rounded-full ${mine ? (active ? "bg-ink" : "bg-sand-deep") : "bg-transparent"}`} />
              </button>
            );
          })}
        </div>
        <button type="button" className="icon-btn shrink-0" aria-label="Semana siguiente" disabled={addDays(monday, 7) > data.last} onClick={() => setDay(addDays(monday, 7))}>
          <Icon name="right" />
        </button>
      </div>

      {sessions.length > 1 && (
        <nav className="flex flex-wrap gap-1.5" aria-label="Ir a la hora">
          {sessions.map((s) => (
            <a key={s.id} href={`#clase-${s.id}`} className={`chip tabular-nums ${s.my_status === "booked" ? "border-sand-deep bg-sand-tint" : ""}`}
              onClick={(e) => { e.preventDefault(); document.getElementById(`clase-${s.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
              {formatTime(s.start_time)}
            </a>
          ))}
        </nav>
      )}

      {closed ? (
        <p className="notice-warn">Gimnasio cerrado{closed.reason ? `: ${closed.reason}` : ""}</p>
      ) : sessions.length === 0 ? (
        <div className="card py-10 text-center text-muted">
          <p>No hay clases este día.</p>
          <p className="mt-1 text-sm">Elige otro día en la semana de arriba.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {sessions.map((s) => <SessionCard key={s.id} s={s} settings={data.settings} onChange={reload} />)}
        </ul>
      )}
      <p className="text-center text-xs text-muted">Puedes reservar con hasta {data.settings.max_days_ahead} días de antelación.</p>
    </div>
  );
}
