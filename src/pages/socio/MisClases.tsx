import { Fragment } from "react";
import { Link, useSearchParams } from "react-router";
import { ErrorBox, Loading } from "../../components/ActionForm";
import { PageHeader } from "../../components/Brand";
import { addDays, formatDate, todayISO } from "../../lib/dates";
import { getSettings, rpc } from "../../lib/supabase";
import type { MemberSession } from "../../lib/types";
import { useData } from "../../lib/useData";
import { SessionCard } from "./SessionCard";

export function MisClases() {
  const [params] = useSearchParams();
  const today = todayISO();
  const { data, error, reload } = useData(async () => {
    const [settings, all] = await Promise.all([
      getSettings(),
      rpc<MemberSession[]>("member_sessions", { p_from: today, p_to: addDays(today, 366) }),
    ]);
    return { settings, sessions: all.filter((s) => s.my_status) };
  });

  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;

  return (
    <div className="space-y-6">
      <PageHeader title="Mis clases" />
      {params.get("cambio") && <p className="notice" role="status">Cambio de clase hecho.</p>}
      {data.sessions.length === 0 ? (
        <div className="card text-center">
          <p className="text-muted">No tienes clases reservadas.</p>
          <Link className="btn mt-4" to="/socio">Ver el horario</Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {data.sessions.map((s, i) => (
            <Fragment key={s.id}>
              {(i === 0 || data.sessions[i - 1].day !== s.day) && <li className="section-title list-none pt-3">{s.day === today ? "Hoy, " + formatDate(s.day).toLowerCase() : formatDate(s.day)}</li>}
              <SessionCard s={s} settings={data.settings} onChange={reload} />
            </Fragment>
          ))}
        </ul>
      )}
    </div>
  );
}
