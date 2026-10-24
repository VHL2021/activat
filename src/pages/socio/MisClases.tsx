import { Fragment } from "react";
import { Link, useSearchParams } from "react-router";
import { ErrorBox, Loading } from "../../components/ActionForm";
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
      <h1 className="text-2xl font-semibold">Mis clases</h1>
      {params.get("cambio") && <p className="rounded-md bg-emerald-50 px-4 py-2 text-sm text-emerald-800">Cambio de clase hecho.</p>}
      {data.sessions.length === 0 ? (
        <p className="text-slate-600">No tienes clases reservadas. <Link className="link underline" to="/socio">Ver el horario</Link></p>
      ) : (
        <ul className="space-y-2">
          {data.sessions.map((s, i) => (
            <Fragment key={s.id}>
              {(i === 0 || data.sessions[i - 1].day !== s.day) && <li className="list-none pt-2 font-semibold">{formatDate(s.day)}</li>}
              <SessionCard s={s} settings={data.settings} onChange={reload} />
            </Fragment>
          ))}
        </ul>
      )}
    </div>
  );
}
