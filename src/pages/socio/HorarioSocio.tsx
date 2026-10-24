import { ErrorBox, Loading } from "../../components/ActionForm";
import { addDays, formatDate, todayISO } from "../../lib/dates";
import { getSettings, must, rpc, supabase } from "../../lib/supabase";
import type { ClosedDay, MemberSession } from "../../lib/types";
import { useData } from "../../lib/useData";
import { SessionCard } from "./SessionCard";

export function HorarioSocio() {
  const today = todayISO();
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
  const days = Array.from({ length: data.settings.max_days_ahead + 1 }, (_, i) => addDays(today, i));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Horario</h1>
        <p className="text-sm text-slate-600">Puedes reservar con hasta {data.settings.max_days_ahead} días de antelación.</p>
      </div>
      {days.map((day) => {
        const sessions = data.sessions.filter((s) => s.day === day);
        const closed = data.closed.find((c) => c.day === day);
        if (!sessions.length && !closed) return null;
        return (
          <section key={day}>
            <h2 className="mb-2 font-semibold">{day === today ? "Hoy, " + formatDate(day).toLowerCase() : formatDate(day)}</h2>
            {closed ? (
              <p className="rounded-md bg-amber-50 px-4 py-2 text-sm text-amber-800">Gimnasio cerrado{closed.reason ? `: ${closed.reason}` : ""}</p>
            ) : (
              <ul className="space-y-2">
                {sessions.map((s) => <SessionCard key={s.id} s={s} settings={data.settings} onChange={reload} />)}
              </ul>
            )}
          </section>
        );
      })}
      {data.sessions.length === 0 && <p className="text-slate-600">No hay clases programadas en los próximos días.</p>}
    </div>
  );
}
