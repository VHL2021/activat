import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { ConfirmButton } from "@/components/confirm-button";
import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { formatDate, formatTime, mondayOf } from "@/lib/dates";
import { getSessionById, listParticipants, type Participant } from "@/lib/sessions";
import { addParticipant, removeParticipant, setSessionCancelled, updateCapacity } from "../actions";

export default async function SessionDetailPage({ params }: PageProps<"/admin/sesiones/[id]">) {
  await requireAdmin();
  const id = Number((await params).id) || 0;
  const session = await getSessionById(id);
  if (!session) notFound();

  const [participants, members] = await Promise.all([
    listParticipants(id),
    query<{ id: number; name: string; email: string }>(
      `SELECT id, name, email FROM users u WHERE active AND role = 'member'
         AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.user_id = u.id AND b.session_id = $1 AND b.status <> 'cancelled')
       ORDER BY name`,
      [id],
    ),
  ]);
  const booked = participants.filter((p) => p.status === "booked");
  const waitlist = participants.filter((p) => p.status === "waitlist");
  const cancelled = participants.filter((p) => p.status === "cancelled");

  return (
    <div className="space-y-6">
      <Link className="text-sm text-emerald-700 hover:underline" href={`/admin/sesiones?semana=${mondayOf(session.day)}`}>
        ← Volver a la semana
      </Link>

      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{session.class_name}</h1>
          <p className="text-slate-600">
            {formatDate(session.day, { year: "numeric" })} · {formatTime(session.start_time)} · {session.duration_min} min
            {session.instructor ? ` · ${session.instructor}` : ""}
          </p>
          {session.cancelled && (
            <p className="mt-1 font-medium text-red-700">
              Sesión cancelada{session.cancel_reason === "closed" ? " (día cerrado en el calendario)" : ""}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <a className="btn-secondary" href={`/admin/sesiones/${id}/csv`} download>Descargar lista (Excel)</a>
          {session.cancel_reason !== "closed" && (
            <form action={setSessionCancelled}>
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="cancelled" value={session.cancelled ? "0" : "1"} />
              {session.cancelled ? (
                <button className="btn-secondary" type="submit">Reabrir sesión</button>
              ) : (
                <ConfirmButton message="¿Cancelar esta sesión? Los socios apuntados dejarán de verla como reservada.">
                  Cancelar sesión
                </ConfirmButton>
              )}
            </form>
          )}
        </div>
      </div>

      <section className="card">
        <ActionForm action={updateCapacity} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="id" value={id} />
          <div>
            <label className="label" htmlFor="capacity">Aforo de esta sesión</label>
            <input className="input w-28" id="capacity" name="capacity" type="number" min={1} defaultValue={session.capacity} />
          </div>
          <button className="btn-secondary" type="submit">Guardar aforo</button>
          <span className="pb-2 text-sm text-slate-600">
            {booked.length} apuntados · {Math.max(session.capacity - booked.length, 0)} plazas libres
          </span>
        </ActionForm>
      </section>

      <ParticipantTable title={`Apuntados (${booked.length})`} rows={booked} removable />
      {waitlist.length > 0 && <ParticipantTable title={`Lista de espera (${waitlist.length})`} rows={waitlist} removable numbered />}

      {!session.cancelled && (
        <section className="card">
          <h2 className="mb-4 font-semibold">Apuntar a un socio</h2>
          {members.length === 0 ? (
            <p className="text-sm text-slate-600">No hay más socios activos para apuntar.</p>
          ) : (
            <ActionForm action={addParticipant} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="session_id" value={id} />
              <div className="min-w-64 flex-1">
                <label className="label" htmlFor="user_id">Socio</label>
                <select className="input" id="user_id" name="user_id">
                  {members.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.email})</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 pb-2 text-sm">
                <input type="checkbox" name="force" /> Apuntar aunque esté llena
              </label>
              <button className="btn" type="submit">Apuntar</button>
            </ActionForm>
          )}
        </section>
      )}

      {cancelled.length > 0 && <ParticipantTable title={`Se desapuntaron (${cancelled.length})`} rows={cancelled} />}
    </div>
  );
}

function ParticipantTable({
  title,
  rows,
  removable,
  numbered,
}: {
  title: string;
  rows: Participant[];
  removable?: boolean;
  numbered?: boolean;
}) {
  return (
    <section className="card overflow-x-auto">
      <h2 className="mb-3 font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-600">Nadie todavía.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>{numbered && <th>#</th>}<th>Nombre</th><th>Email</th><th>Teléfono</th>{removable && <th></th>}</tr>
          </thead>
          <tbody>
            {rows.map((p, index) => (
              <tr key={p.booking_id}>
                {numbered && <td>{index + 1}</td>}
                <td className="font-medium">{p.name}</td>
                <td>{p.email}</td>
                <td>{p.phone}</td>
                {removable && (
                  <td className="text-right">
                    <form action={removeParticipant}>
                      <input type="hidden" name="booking_id" value={p.booking_id} />
                      <ConfirmButton message={`¿Desapuntar a ${p.name}?`}>Desapuntar</ConfirmButton>
                    </form>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
