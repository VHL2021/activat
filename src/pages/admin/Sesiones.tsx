import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { ActionForm, ErrorBox, Loading } from "../../components/ActionForm";
import { Icon, PageHeader } from "../../components/Brand";
import { MonthCalendar } from "../../components/Calendar";
import { DatePicker } from "../../components/DatePicker";
import { TimePicker } from "../../components/TimePicker";
import { addDays, dayNumber, formatDate, formatTime, monthGrid, monthOf, mondayOf, todayISO, WEEKDAY_LETTERS } from "../../lib/dates";
import { getSettings, must, rpc, supabase } from "../../lib/supabase";
import type { ClosedDay, SessionOverview } from "../../lib/types";
import { useData } from "../../lib/useData";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

// Color de una sesión según lo llena que está.
const fill = (s: SessionOverview) =>
  s.cancelled ? "border-line-soft bg-paper text-faint line-through"
    : s.booked >= s.capacity ? "border-sand-deep bg-sand-tint"
    : s.booked === 0 ? "border-line bg-surface"
    : "border-sky bg-sky-tint/60";

export function Sesiones() {
  const [params, setParams] = useSearchParams();
  const today = todayISO();
  const view = params.get("vista") === "mes" ? "mes" : "semana";
  const requested = params.get(view === "mes" ? "mes" : "semana");
  const anchor = requested && ISO.test(requested) ? requested : today;
  const monday = mondayOf(anchor);
  const month = monthOf(anchor);
  const grid = monthGrid(month);
  const [from, to] = view === "mes" ? [grid[0], grid[grid.length - 1]] : [monday, addDays(monday, 6)];

  const { data, error, reload } = useData(async () => {
    // Solo se generan sesiones a partir de hoy; lo pasado muestra lo que hubo.
    if (to >= today) await rpc("ensure_sessions", { p_from: from < today ? today : from, p_to: to });
    const [sessions, classes, closed, settings] = await Promise.all([
      must(supabase.from("session_overview").select().gte("day", from).lte("day", to).order("day").order("start_time")),
      must(supabase.from("class_types").select("id, name").eq("active", true).order("name")),
      must(supabase.from("closed_days").select().gte("day", from).lte("day", to)),
      getSettings(),
    ]);
    return {
      sessions: sessions as SessionOverview[],
      classes: classes as { id: number; name: string }[],
      closed: closed as ClosedDay[],
      settings,
    };
  }, [from, to]);

  const go = (next: Record<string, string>) => setParams({ vista: view, ...next });
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const title = view === "mes" ? undefined
    : `Semana del ${formatDate(monday, { weekday: undefined })} al ${formatDate(addDays(monday, 6), { weekday: undefined, year: "numeric" })}`;

  return (
    <div className="space-y-6">
      <PageHeader title="Sesiones" lead={title}>
        <div className="flex rounded-full border border-line bg-surface p-1" role="tablist" aria-label="Vista">
          {(["semana", "mes"] as const).map((v) => (
            <button key={v} type="button" role="tab" aria-selected={view === v}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold capitalize ${view === v ? "bg-ink text-white" : "text-muted hover:text-ink"}`}
              onClick={() => setParams(v === "mes" ? { vista: "mes", mes: monthOf(monday) } : { vista: "semana", semana: view === "mes" ? month : monday })}>
              {v}
            </button>
          ))}
        </div>
        {view === "semana" && (
          <div className="flex gap-1.5">
            <button type="button" className="icon-btn" aria-label="Semana anterior" onClick={() => go({ semana: addDays(monday, -7) })}><Icon name="left" /></button>
            <button type="button" className="btn-secondary" onClick={() => go({ semana: today })}>Hoy</button>
            <button type="button" className="icon-btn" aria-label="Semana siguiente" onClick={() => go({ semana: addDays(monday, 7) })}><Icon name="right" /></button>
          </div>
        )}
      </PageHeader>

      <ErrorBox error={error} />
      {!data ? <Loading /> : (
        <>
          {view === "semana" ? (
            <div className="grid gap-2 md:grid-cols-7">
              {days.map((day, i) => {
                const sessions = data.sessions.filter((s) => s.day === day);
                const closed = data.closed.find((c) => c.day === day);
                return (
                  <section key={day} aria-label={formatDate(day)}
                    className={`flex gap-3 rounded-2xl border p-2.5 md:min-h-72 md:flex-col md:gap-2 ${day === today ? "border-ink bg-surface" : "border-line bg-surface/60"}`}>
                    <h2 className="flex w-12 shrink-0 flex-col items-center md:w-auto md:flex-row md:justify-between md:px-1">
                      <span className="text-xs font-semibold text-muted">{WEEKDAY_LETTERS[i]}</span>
                      <span className={`time text-2xl leading-none ${day === today ? "text-sky-deep" : ""}`}>{dayNumber(day)}</span>
                    </h2>
                    <div className="flex flex-1 flex-col gap-1.5">
                      {closed && <p className="rounded-lg bg-sand-tint px-2 py-1 text-xs font-semibold text-sand-text">Cerrado{closed.reason ? `: ${closed.reason}` : ""}</p>}
                      {sessions.length === 0 && !closed && <p className="py-1 text-xs text-faint md:text-center">Sin sesiones</p>}
                      {sessions.map((s) => (
                        <Link key={s.id} to={`/admin/sesiones/${s.id}`}
                          className={`block rounded-xl border px-2.5 py-2 transition-transform hover:-translate-y-0.5 hover:border-ink ${fill(s)}`}>
                          <span className="time block text-lg leading-none">{formatTime(s.start_time)}</span>
                          <span className="block truncate text-sm font-semibold">{s.class_name}</span>
                          {!s.cancelled && (
                            <span className="mt-1.5 flex items-center gap-1.5">
                              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white">
                                <span className="block h-full rounded-full bg-ink" style={{ width: `${Math.min(s.booked / s.capacity, 1) * 100}%` }} />
                              </span>
                              <span className="text-[11px] font-semibold tabular-nums">{s.booked}/{s.capacity}</span>
                            </span>
                          )}
                          {s.waitlist > 0 && <span className="text-[11px] text-sand-text">+{s.waitlist} en espera</span>}
                        </Link>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          ) : (
            <section className="card p-3 sm:p-5">
              <MonthCalendar
                month={month}
                onMonthChange={(m) => go({ mes: m })}
                dayClass={(d) => (data.closed.some((c) => c.day === d) ? "!bg-sand-tint" : "")}
                renderDay={(d) => {
                  const closed = data.closed.find((c) => c.day === d);
                  return (
                    <span className="mt-1 flex flex-col gap-0.5">
                      {closed && <span className="truncate text-[10px] font-semibold text-sand-text">Cerrado</span>}
                      {data.sessions.filter((s) => s.day === d).map((s) => (
                        <Link key={s.id} to={`/admin/sesiones/${s.id}`} title={`${s.class_name}: ${s.booked} de ${s.capacity}`}
                          className={`flex items-center justify-between gap-1 rounded-md border px-1 py-0.5 text-[10px] font-semibold tabular-nums hover:border-ink sm:text-[11px] ${fill(s)}`}>
                          <span className="truncate"><span className="hidden lg:inline">{formatTime(s.start_time)} </span>{s.class_name}</span>
                          <span className="hidden sm:inline">{s.booked}/{s.capacity}</span>
                        </Link>
                      ))}
                    </span>
                  );
                }}
              />
            </section>
          )}

          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
            <span className="flex items-center gap-1.5"><span className="size-3 rounded border border-line bg-surface" /> Sin apuntados</span>
            <span className="flex items-center gap-1.5"><span className="size-3 rounded border border-sky bg-sky-tint" /> Con apuntados</span>
            <span className="flex items-center gap-1.5"><span className="size-3 rounded border border-sand-deep bg-sand-tint" /> Completa</span>
          </div>

          {data.classes.length > 0 && <OneOff classes={data.classes} slots={data.settings.time_slots} onDone={reload} />}
        </>
      )}
    </div>
  );
}

function OneOff({ classes, slots, onDone }: { classes: { id: number; name: string }[]; slots: string[]; onDone: () => unknown }) {
  const today = todayISO();
  const [day, setDay] = useState<{ from: string | null; to: string | null }>({ from: null, to: null });
  return (
    <section className="card">
      <h2 className="section-title mb-1">Sesión puntual</h2>
      <p className="mb-5 text-sm text-muted">Para una clase extra que no está en el horario semanal.</p>
      <ActionForm
        onDone={onDone}
        className="grid gap-6 md:grid-cols-[minmax(0,22rem)_1fr]"
        action={async (form) => {
          if (!day.from) throw new Error("Elige el día en el calendario.");
          if (!form.get("start_time")) throw new Error("Elige la hora.");
          await rpc("admin_create_one_off", {
            p_class_type_id: Number(form.get("class_type_id")), p_day: day.from, p_time: form.get("start_time"),
          });
          return `Sesión puntual creada para el ${formatDate(day.from).toLowerCase()}.`;
        }}
      >
        <DatePicker name="day" min={today} value={day} onChange={setDay} />
        <div className="flex flex-col gap-5">
          <div>
            <label className="label" htmlFor="class_type_id">Clase</label>
            <select className="input" id="class_type_id" name="class_type_id">
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <span className="label">Hora</span>
            <TimePicker name="start_time" slots={slots} />
          </div>
          <button className="btn self-start" type="submit">Crear sesión</button>
        </div>
      </ActionForm>
    </section>
  );
}
