import { Link } from "react-router";
import { ErrorBox, Loading } from "../../components/ActionForm";
import { addDays, formatDate, formatTime, todayISO } from "../../lib/dates";
import { must, rpc, supabase } from "../../lib/supabase";
import type { SessionOverview } from "../../lib/types";
import { useData } from "../../lib/useData";

export function Inicio() {
  const today = todayISO();
  const tomorrow = addDays(today, 1);
  const { data, error } = useData(async () => {
    await rpc("ensure_sessions", { p_from: today, p_to: tomorrow });
    const [sessions, members, classes, slots, closed] = await Promise.all([
      must(supabase.from("session_overview").select().gte("day", today).lte("day", tomorrow).order("day").order("start_time")),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("active", true).eq("role", "member"),
      supabase.from("class_types").select("id", { count: "exact", head: true }).eq("active", true),
      supabase.from("schedule_slots").select("id", { count: "exact", head: true }).or(`valid_to.is.null,valid_to.gte.${today}`),
      must(supabase.from("closed_days").select().gte("day", today).order("day").limit(1)),
    ]);
    return {
      sessions: sessions as SessionOverview[],
      stats: [
        { label: "Socios activos", value: members.count ?? 0, to: "/admin/socios" },
        { label: "Clases", value: classes.count ?? 0, to: "/admin/clases" },
        { label: "Clases a la semana", value: slots.count ?? 0, to: "/admin/horario" },
      ],
      nextClosed: closed[0] as { day: string; reason: string | null } | undefined,
    };
  });

  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Inicio</h1>
      <div className="grid gap-3 sm:grid-cols-3">
        {data.stats.map((stat) => (
          <Link key={stat.label} to={stat.to} className="card block hover:border-emerald-600">
            <div className="text-sm text-slate-600">{stat.label}</div>
            <div className="text-3xl font-semibold">{stat.value}</div>
          </Link>
        ))}
      </div>
      {data.nextClosed && (
        <p className="rounded-md bg-amber-50 px-4 py-2 text-sm text-amber-800">
          Próximo día cerrado: {formatDate(data.nextClosed.day)}
          {data.nextClosed.reason ? ` (${data.nextClosed.reason})` : ""}
        </p>
      )}
      {[today, tomorrow].map((day) => {
        const sessions = data.sessions.filter((s) => s.day === day);
        return (
          <section key={day} className="card">
            <h2 className="mb-2 font-semibold">{day === today ? "Hoy" : "Mañana"}, {formatDate(day).toLowerCase()}</h2>
            {sessions.length === 0 ? (
              <p className="text-sm text-slate-500">Sin sesiones.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {sessions.map((s) => (
                  <li key={s.id}>
                    <Link
                      to={`/admin/sesiones/${s.id}`}
                      className={`flex justify-between py-2 text-sm hover:text-emerald-700 ${s.cancelled ? "text-slate-400 line-through" : ""}`}
                    >
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
