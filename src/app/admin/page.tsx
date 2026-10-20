import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { addDays, formatDate, formatTime, todayISO } from "@/lib/dates";
import { ensureSessions } from "@/lib/schedule";
import { listSessions } from "@/lib/sessions";

export default async function AdminHome() {
  await requireAdmin();
  const today = todayISO();
  const tomorrow = addDays(today, 1);
  await ensureSessions(today, tomorrow);
  const [sessions, counts, nextClosed] = await Promise.all([
    listSessions(today, tomorrow),
    queryOne<{ members: number; classes: number; slots: number }>(
      `SELECT (SELECT count(*)::int FROM users WHERE active AND role = 'member') AS members,
         (SELECT count(*)::int FROM class_types WHERE active) AS classes,
         (SELECT count(*)::int FROM schedule_slots WHERE valid_to IS NULL OR valid_to >= CURRENT_DATE) AS slots`,
    ),
    queryOne<{ day: string; reason: string | null }>(
      "SELECT day, reason FROM closed_days WHERE day >= CURRENT_DATE ORDER BY day LIMIT 1",
    ),
  ]);

  const stats = [
    { label: "Socios activos", value: counts?.members ?? 0, href: "/admin/socios" },
    { label: "Clases", value: counts?.classes ?? 0, href: "/admin/clases" },
    { label: "Clases a la semana", value: counts?.slots ?? 0, href: "/admin/horario" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Inicio</h1>

      <div className="grid gap-3 sm:grid-cols-3">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="card block hover:border-emerald-600">
            <div className="text-sm text-slate-600">{stat.label}</div>
            <div className="text-3xl font-semibold">{stat.value}</div>
          </Link>
        ))}
      </div>

      {nextClosed && (
        <p className="rounded-md bg-amber-50 px-4 py-2 text-sm text-amber-800">
          Próximo día cerrado: <span>{formatDate(nextClosed.day)}</span>
          {nextClosed.reason ? ` (${nextClosed.reason})` : ""}
        </p>
      )}

      {[today, tomorrow].map((day) => {
        const daySessions = sessions.filter((s) => s.day === day);
        return (
          <section key={day} className="card">
            <h2 className="mb-2 font-semibold">{day === today ? "Hoy" : "Mañana"}, {formatDate(day).toLowerCase()}</h2>
            {daySessions.length === 0 ? (
              <p className="text-sm text-slate-500">Sin sesiones.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {daySessions.map((s) => (
                  <li key={s.id}>
                    <Link href={`/admin/sesiones/${s.id}`} className={`flex justify-between py-2 text-sm hover:text-emerald-700 ${s.cancelled ? "text-slate-400 line-through" : ""}`}>
                      <span><span className="font-medium">{formatTime(s.start_time)}</span> · {s.class_name}</span>
                      <span>{s.booked} / {s.capacity}{s.waitlist > 0 ? ` (+${s.waitlist})` : ""}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
