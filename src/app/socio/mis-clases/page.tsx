import Link from "next/link";
import { Fragment } from "react";
import { requireUser } from "@/lib/auth";
import { addDays, formatDate, todayISO } from "@/lib/dates";
import { listMemberSessions } from "@/lib/sessions";
import { getSettings } from "@/lib/settings";
import { SessionCard } from "../session-card";

export default async function MisClasesPage({ searchParams }: PageProps<"/socio/mis-clases">) {
  const user = await requireUser();
  const settings = await getSettings();
  const today = todayISO();
  const changed = (await searchParams).cambio === "1";
  const sessions = await listMemberSessions(user.id, today, addDays(today, 366), true);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Mis clases</h1>
      {changed && <p className="rounded-md bg-emerald-50 px-4 py-2 text-sm text-emerald-800">Cambio de clase hecho.</p>}
      {sessions.length === 0 ? (
        <p className="text-slate-600">
          No tienes clases reservadas. <Link className="text-emerald-700 underline" href="/socio">Ver el horario</Link>
        </p>
      ) : (
        <ul className="space-y-2">
          {sessions.map((s, index) => (
            <Fragment key={s.id}>
              {(index === 0 || sessions[index - 1].day !== s.day) && (
                <li className="list-none pt-2 font-semibold">{formatDate(s.day)}</li>
              )}
              <SessionCard s={s} settings={settings} />
            </Fragment>
          ))}
        </ul>
      )}
    </div>
  );
}
