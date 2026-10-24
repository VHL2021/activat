import { Link, useSearchParams } from "react-router";
import { ActionForm, ErrorBox, Loading } from "../../components/ActionForm";
import { addDays, formatDate, formatTime, mondayOf, todayISO } from "../../lib/dates";
import { must, rpc, supabase } from "../../lib/supabase";
import type { ClosedDay, SessionOverview } from "../../lib/types";
import { useData } from "../../lib/useData";

export function Sesiones() {
  const [params] = useSearchParams();
  const today = todayISO();
  const requested = params.get("semana");
  const monday = mondayOf(requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : today);
  const sunday = addDays(monday, 6);

  const { data, error, reload } = useData(async () => {
    // Solo se generan sesiones a partir de hoy; las semanas pasadas muestran lo que hubo.
    if (sunday >= today) await rpc("ensure_sessions", { p_from: monday, p_to: sunday });
    const [sessions, classes, closed] = await Promise.all([
      must(supabase.from("session_overview").select().gte("day", monday).lte("day", sunday).order("day").order("start_time")),
      must(supabase.from("class_types").select("id, name").eq("active", true).order("name")),
      must(supabase.from("closed_days").select().gte("day", monday).lte("day", sunday)),
    ]);
    return {
      sessions: sessions as SessionOverview[],
      classes: classes as { id: number; name: string }[],
      closed: closed as ClosedDay[],
    };
  }, [monday]);

  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

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
          <Link className="btn-secondary" to={`?semana=${addDays(monday, -7)}`}>← Anterior</Link>
          <Link className="btn-secondary" to="?">Esta semana</Link>
          <Link className="btn-secondary" to={`?semana=${addDays(monday, 7)}`}>Siguiente →</Link>
        </div>
      </div>

      <ErrorBox error={error} />
      {!data ? <Loading /> : (
        <>
          <div className="space-y-4">
            {days.map((day) => {
              const sessions = data.sessions.filter((s) => s.day === day);
              const closed = data.closed.find((c) => c.day === day);
              return (
                <section key={day} className={`card ${day === today ? "ring-2 ring-emerald-600" : ""}`}>
                  <h2 className="mb-2 font-semibold">
                    {formatDate(day)}
                    {closed && (
                      <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                        Cerrado{closed.reason ? `: ${closed.reason}` : ""}
                      </span>
                    )}
                  </h2>
                  {sessions.length === 0 ? <p className="text-sm text-slate-500">Sin sesiones</p> : (
                    <div className="overflow-x-auto">
                      <table className="table">
                        <tbody>
                          {sessions.map((s) => (
                            <tr key={s.id} className={s.cancelled ? "text-slate-400 line-through" : ""}>
                              <td className="w-20 font-medium">{formatTime(s.start_time)}</td>
                              <td>{s.class_name}</td>
                              <td className="hidden text-slate-600 sm:table-cell">{s.instructor}</td>
                              <td className="w-40 whitespace-nowrap">
                                <span className={s.booked >= s.capacity ? "font-medium text-red-700" : ""}>{s.booked}/{s.capacity} plazas</span>
                                {s.waitlist > 0 && <span className="block text-xs text-amber-700">+{s.waitlist} en espera</span>}
                              </td>
                              <td className="w-28 whitespace-nowrap text-right">
                                <Link className="btn-secondary" to={`/admin/sesiones/${s.id}`}>Ver lista</Link>
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

          {data.classes.length > 0 && (
            <section className="card">
              <h2 className="mb-1 font-semibold">Sesión puntual</h2>
              <p className="mb-4 text-sm text-slate-600">Para una clase extra que no está en el horario semanal.</p>
              <ActionForm
                resetOnSuccess
                onDone={reload}
                className="grid gap-4 md:grid-cols-4 md:items-end"
                action={async (form) => {
                  await rpc("admin_create_one_off", {
                    p_class_type_id: Number(form.get("class_type_id")), p_day: form.get("day"), p_time: form.get("start_time"),
                  });
                  return "Sesión puntual creada.";
                }}
              >
                <div>
                  <label className="label" htmlFor="class_type_id">Clase</label>
                  <select className="input" id="class_type_id" name="class_type_id">
                    {data.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
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
        </>
      )}
    </div>
  );
}
