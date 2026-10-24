import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { requireUser } from "@/lib/auth";
import { addDays, formatDate, formatTime, todayISO } from "@/lib/dates";
import { ensureSessions } from "@/lib/schedule";
import { listMemberSessions } from "@/lib/sessions";
import { getSettings } from "@/lib/settings";
import { switchAction } from "../../actions";

export default async function CambiarPage({ params }: PageProps<"/socio/cambiar/[id]">) {
  const user = await requireUser();
  const fromId = Number((await params).id) || 0;
  const settings = await getSettings();
  const today = todayISO();
  const last = addDays(today, settings.maxDaysAhead);
  await ensureSessions(today, last);
  const sessions = await listMemberSessions(user.id, today, last);
  const current = sessions.find((s) => s.id === fromId && s.my_status === "booked");
  if (!current) notFound();
  const options = sessions.filter(
    (s) =>
      !s.my_status && !s.cancelled && s.booked < s.capacity && s.minutes_until >= settings.bookingCloseMinutes,
  );

  return (
    <div className="space-y-6">
      <Link className="text-sm text-emerald-700 hover:underline" href="/socio/mis-clases">← Volver a mis clases</Link>
      <div>
        <h1 className="text-2xl font-semibold">Cambiar de clase</h1>
        <p className="text-sm text-slate-600">
          Ahora: {current.class_name}, {formatDate(current.day).toLowerCase()} a las {formatTime(current.start_time)}.
          Elige la nueva clase; solo aparecen las que tienen plazas libres.
        </p>
      </div>
      {options.length === 0 ? (
        <p className="text-slate-600">No hay otras clases con plazas libres en los próximos días.</p>
      ) : (
        <ul className="space-y-2">
          {options.map((s) => (
            <li key={s.id} className="card flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-semibold">{formatDate(s.day)} · {formatTime(s.start_time)}</div>
                <div className="text-sm text-slate-600">
                  {s.class_name}{s.instructor ? ` · ${s.instructor}` : ""} · {s.capacity - s.booked} plazas libres
                </div>
              </div>
              <ActionForm action={switchAction}>
                <input type="hidden" name="from_session_id" value={current.id} />
                <input type="hidden" name="to_session_id" value={s.id} />
                <button className="btn" type="submit">Cambiar a esta</button>
              </ActionForm>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
