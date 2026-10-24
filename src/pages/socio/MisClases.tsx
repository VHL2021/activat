import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { ErrorBox, Loading } from "../../components/ActionForm";
import { Icon, PageHeader } from "../../components/Brand";
import { MonthCalendar } from "../../components/Calendar";
import { useAuth } from "../../lib/auth";
import { addDays, formatDate, formatTime, monthGrid, monthOf, todayISO } from "../../lib/dates";
import { getSettings, must, rpc, supabase } from "../../lib/supabase";
import type { MemberSession } from "../../lib/types";
import { useData } from "../../lib/useData";
import { SessionCard } from "./SessionCard";

type Booking = {
  id: number;
  status: "booked" | "waitlist";
  sessions: { id: number; day: string; start_time: string; cancelled: boolean; class_types: { name: string } };
};

// Mis clases: calendario del mes con las clases en las que estoy apuntado (también las pasadas).
export function MisClases() {
  const [params] = useSearchParams();
  const { profile } = useAuth();
  const today = todayISO();
  const [month, setMonth] = useState(monthOf(today));
  const [picked, setPicked] = useState<string | null>(null);

  const { data, error, reload } = useData(async () => {
    const grid = monthGrid(month);
    const [settings, bookings, upcoming] = await Promise.all([
      getSettings(),
      must(supabase.from("bookings")
        .select("id, status, sessions!inner(id, day, start_time, cancelled, class_types(name))")
        .eq("user_id", profile!.id).in("status", ["booked", "waitlist"])
        .gte("sessions.day", grid[0]).lte("sessions.day", grid[grid.length - 1])),
      rpc<MemberSession[]>("member_sessions", { p_from: today, p_to: addDays(today, 366) }),
    ]);
    const rows = (bookings as unknown as Booking[]).sort((a, b) =>
      (a.sessions.day + a.sessions.start_time).localeCompare(b.sessions.day + b.sessions.start_time));
    return { settings, bookings: rows, upcoming: upcoming.filter((s) => s.my_status) };
  }, [month]);

  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  const next = data.upcoming[0]?.day;
  const day = picked ?? (next && next.slice(0, 7) === month.slice(0, 7) ? next : null);
  const dayBookings = day ? data.bookings.filter((b) => b.sessions.day === day) : [];

  return (
    <div className="space-y-6">
      <PageHeader title="Mis clases" lead={data.upcoming.length ? `Tienes ${data.upcoming.length} clase${data.upcoming.length === 1 ? "" : "s"} reservada${data.upcoming.length === 1 ? "" : "s"}.` : undefined} />
      {params.get("cambio") && <p className="notice" role="status">Cambio de clase hecho.</p>}

      <section className="card p-3 sm:p-5">
        <MonthCalendar
          month={month}
          onMonthChange={(m) => { setMonth(m); setPicked(null); }}
          onDayClick={setPicked}
          dayClass={(d) => (d === day ? "!border-ink border-2" : d < today ? "bg-paper" : "")}
          renderDay={(d) => (
            <span className="mt-1 flex flex-col gap-1">
              {data.bookings.filter((b) => b.sessions.day === d).map((b) => (
                <span
                  key={b.id}
                  className={`flex items-center justify-center gap-0.5 rounded-md px-1 py-0.5 text-[11px] font-semibold tabular-nums sm:justify-start sm:px-1.5 sm:text-xs ${
                    b.sessions.cancelled ? "bg-line-soft text-faint line-through"
                      : b.status === "waitlist" ? "bg-sky-tint text-sky-deep"
                      : d < today ? "bg-sand-tint text-sand-text" : "bg-sand text-ink"
                  }`}
                  title={`${b.sessions.class_types.name} a las ${formatTime(b.sessions.start_time)}`}
                >
                  {formatTime(b.sessions.start_time)}
                  <Icon name={b.status === "waitlist" ? "clock" : "check"} className="hidden size-3 sm:block" />
                </span>
              ))}
            </span>
          )}
        />
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-sand" /> Apuntado</span>
          <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-sky-tint" /> En lista de espera</span>
          <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-sand-tint" /> Ya hecha</span>
        </div>
      </section>

      {day ? (
        <section>
          <h2 className="section-title mb-3">{day === today ? "Hoy, " + formatDate(day).toLowerCase() : formatDate(day)}</h2>
          {dayBookings.length === 0 ? (
            <div className="card text-center">
              <p className="text-muted">No tienes clases este día.</p>
              {day >= today && <Link className="btn mt-4" to="/socio">Reservar una clase</Link>}
            </div>
          ) : (
            <ul className="space-y-4">
              {dayBookings.map((b) => {
                const live = data.upcoming.find((s) => s.id === b.sessions.id);
                return live ? <SessionCard key={b.id} s={live} settings={data.settings} onChange={reload} /> : (
                  <li key={b.id} className="card flex items-center justify-between gap-4">
                    <div>
                      <p className="font-display text-xl font-black">{b.sessions.class_types.name}</p>
                      <p className="text-sm text-muted">{b.sessions.cancelled ? "Clase cancelada" : "Clase ya hecha"}</p>
                    </div>
                    <span className="time text-3xl">{formatTime(b.sessions.start_time)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : data.upcoming.length === 0 && (
        <div className="card text-center">
          <p className="text-muted">No tienes clases reservadas.</p>
          <Link className="btn mt-4" to="/socio">Ver el horario</Link>
        </div>
      )}
    </div>
  );
}
