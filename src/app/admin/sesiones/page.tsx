import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { addDays, formatDate, formatTime, mondayOf, todayISO } from "@/lib/dates";
import { ensureSessions } from "@/lib/schedule";
import { listSessions } from "@/lib/sessions";
import { createOneOffSession } from "./actions";

export default async function SesionesPage({ searchParams }: PageProps<"/admin/sesiones">) {
  await requireAdmin();
  const requested = (await searchParams).semana;
  const today = todayISO();
  const monday = mondayOf(typeof requested === "string" && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : today);
  const sunday = addDays(monday, 6);

  // Solo se generan sesiones a partir de hoy; las semanas pasadas muestran lo que hubo.
  if (sunday >= today) await ensureSessions(monday > today ? monday : today, sunday);

  const [sessions, classes, closedDays] = await Promise.all([
    listSessions(monday, sunday),
    query<{ id: number; name: string }>("SELECT id, name FROM class_types WHERE active ORDER BY name"),
    query<{ day: string; reason: string | null; kind: string }>(
      "SELECT day, reason, kind FROM closed_days WHERE day BETWEEN $1 AND $2",
      [monday, sunday],
    ),
  ]);

  const days = Array.from({ length: 7 }, (_, index) => addDays(monday, index));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Sesiones</h1>
          <p className="text-sm text-slate-600">
            Semana del {formatDate(monday, { weekday: undefined })} al {formatDate(sunday, { weekday: undefined, year: "numeric" })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link className="btn-secondary" href={`?semana=${addDays(monday, -7)}`}>← Anterior</Link>
          <Link className="btn-secondary" href="?">Esta semana</Link>
          <Link className="btn-secondary" href={`?semana=${addDays(monday, 7)}`}>Siguiente →</Link>
        </div>
      </div>

      <div className="space-y-4">
        {days.map((day) => {
          const daySessions = sessions.filter((s) => s.day === day);
          const closed = closedDays.find((c) => c.day === day);
          return (
            <section key={day} className={`card ${day === today ? "ring-2 ring-emerald-600" : ""}`}>
              <h2 className="mb-2 font-semibold">
                {formatDate(day)}
                {closed && (
                  <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs font-medium normal-case text-amber-800">
                    Cerrado{closed.reason ? `: ${closed.reason}` : ""}
                  </span>
                )}
              </h2>
              {daySessions.length === 0 ? (
                <p className="text-sm text-slate-500">Sin sesiones</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table">
                    <tbody>
                      {daySessions.map((s) => (
                        <tr key={s.id} className={s.cancelled ? "text-slate-400 line-through" : ""}>
                          <td className="w-20 font-medium">{formatTime(s.start_time)}</td>
                          <td>{s.class_name}</td>
                          <td className="hidden text-slate-600 sm:table-cell">{s.instructor}</td>
                          <td className="w-40 whitespace-nowrap">
                            <span className={s.booked >= s.capacity ? "font-medium text-red-700" : ""}>
                              {s.booked}/{s.capacity} plazas
                            </span>
                            {s.waitlist > 0 && <span className="block text-xs text-amber-700">+{s.waitlist} en espera</span>}
                          </td>
                          <td className="w-28 whitespace-nowrap text-right">
                            <Link className="btn-secondary no-underline" href={`/admin/sesiones/${s.id}`}>Ver lista</Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          );
        })}
      </div>

      {classes.length > 0 && (
        <section className="card">
          <h2 className="mb-1 font-semibold">Sesión puntual</h2>
          <p className="mb-4 text-sm text-slate-600">Para una clase extra que no está en el horario semanal.</p>
          <ActionForm action={createOneOffSession} resetOnSuccess className="grid gap-4 md:grid-cols-4 md:items-end">
            <div>
              <label className="label" htmlFor="class_type_id">Clase</label>
              <select className="input" id="class_type_id" name="class_type_id">
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="day">Fecha</label>
              <input className="input" id="day" name="day" type="date" required min={today} />
            </div>
            <div>
              <label className="label" htmlFor="start_time">Hora</label>
              <input className="input" id="start_time" name="start_time" type="time" required />
            </div>
            <button className="btn" type="submit">Crear sesión</button>
          </ActionForm>
        </section>
      )}
    </div>
  );
}
