import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { addDays, formatDate, todayISO } from "@/lib/dates";
import { ensureSessions } from "@/lib/schedule";
import { listMemberSessions } from "@/lib/sessions";
import { getSettings } from "@/lib/settings";
import { SessionCard } from "./session-card";

export default async function HorarioSocioPage() {
  const user = await requireUser();
  const settings = await getSettings();
  const today = todayISO();
  const last = addDays(today, settings.maxDaysAhead);
  await ensureSessions(today, last);
  const [sessions, closedDays] = await Promise.all([
    listMemberSessions(user.id, today, last),
    query<{ day: string; reason: string | null }>(
      "SELECT day, reason FROM closed_days WHERE day BETWEEN $1 AND $2",
      [today, last],
    ),
  ]);
  const days = Array.from({ length: settings.maxDaysAhead + 1 }, (_, i) => addDays(today, i));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Horario</h1>
        <p className="text-sm text-slate-600">Puedes reservar con hasta {settings.maxDaysAhead} días de antelación.</p>
      </div>
      {days.map((day) => {
        const daySessions = sessions.filter((s) => s.day === day);
        const closed = closedDays.find((c) => c.day === day);
        if (!daySessions.length && !closed) return null;
        return (
          <section key={day}>
            <h2 className="mb-2 font-semibold">
              {day === today ? "Hoy, " + formatDate(day).toLowerCase() : formatDate(day)}
            </h2>
            {closed ? (
              <p className="rounded-md bg-amber-50 px-4 py-2 text-sm text-amber-800">
                Gimnasio cerrado{closed.reason ? `: ${closed.reason}` : ""}
              </p>
            ) : (
              <ul className="space-y-2">
                {daySessions.map((s) => <SessionCard key={s.id} s={s} settings={settings} />)}
              </ul>
            )}
          </section>
        );
      })}
      {sessions.length === 0 && <p className="text-slate-600">No hay clases programadas en los próximos días.</p>}
    </div>
  );
}
