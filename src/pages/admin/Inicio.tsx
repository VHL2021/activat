import { Link } from "react-router";
import { ErrorBox, Loading } from "../../components/ActionForm";
import { PageHeader } from "../../components/Brand";
import { addDays, formatDate, todayISO } from "../../lib/dates";
import { must, rpc, supabase } from "../../lib/supabase";
import type { SessionOverview } from "../../lib/types";
import { useData } from "../../lib/useData";
import { SessionRow } from "./SessionRow";

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
    <div className="space-y-8">
      <PageHeader title="Inicio" lead={`${formatDate(today)}.`} />

      <dl className="flex flex-wrap gap-x-10 gap-y-4 border-y border-line py-4">
        {data.stats.map((stat) => (
          <Link key={stat.label} to={stat.to} className="group flex items-baseline gap-2.5">
            <dd className="time text-4xl leading-none">{stat.value}</dd>
            <dt className="text-sm font-medium text-muted group-hover:text-ink">{stat.label}</dt>
          </Link>
        ))}
      </dl>

      {data.nextClosed && (
        <p className="notice-warn">
          Próximo día cerrado: {formatDate(data.nextClosed.day)}
          {data.nextClosed.reason ? ` (${data.nextClosed.reason})` : ""}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {[today, tomorrow].map((day) => {
          const sessions = data.sessions.filter((s) => s.day === day);
          return (
            <section key={day} className="card">
              <h2 className="section-title">{day === today ? "Hoy" : "Mañana"}</h2>
              <p className="text-sm text-muted">{formatDate(day)}</p>
              {sessions.length === 0 ? (
                <p className="mt-4 text-sm text-muted">No hay sesiones.</p>
              ) : (
                <ul className="mt-2 divide-y divide-line-soft">
                  {sessions.map((s) => <SessionRow key={s.id} s={s} />)}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
