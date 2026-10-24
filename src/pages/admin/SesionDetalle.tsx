import { Link, useParams } from "react-router";
import { ActionButton, ActionForm, ErrorBox, Loading } from "../../components/ActionForm";
import { CapacityMeter } from "../../components/Brand";
import { downloadCsv } from "../../lib/csv";
import { formatDate, formatTime, mondayOf } from "../../lib/dates";
import { intField, must, rpc, supabase } from "../../lib/supabase";
import type { SessionOverview } from "../../lib/types";
import { useData } from "../../lib/useData";

type Participant = {
  id: number;
  status: "booked" | "waitlist" | "cancelled";
  created_at: string;
  profiles: { id: string; name: string; email: string; phone: string | null };
};

const STATUS_LABELS = { booked: "Apuntado", waitlist: "Lista de espera", cancelled: "Desapuntado" };

export function SesionDetalle() {
  const id = Number(useParams().id);
  const { data, error, reload } = useData(async () => {
    const [session, participants, members] = await Promise.all([
      must(supabase.from("session_overview").select().eq("id", id).single()),
      must(supabase.from("bookings").select("id, status, created_at, profiles(id, name, email, phone)").eq("session_id", id).order("created_at")),
      must(supabase.from("profiles").select("id, name, email").eq("active", true).order("name")),
    ]);
    return {
      session: session as SessionOverview,
      participants: participants as unknown as Participant[],
      members: members as { id: string; name: string; email: string }[],
    };
  }, [id]);

  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  const { session, participants } = data;
  const booked = participants.filter((p) => p.status === "booked");
  const waitlist = participants.filter((p) => p.status === "waitlist");
  const cancelled = participants.filter((p) => p.status === "cancelled");
  const inSession = new Set(participants.filter((p) => p.status !== "cancelled").map((p) => p.profiles.id));
  const candidates = data.members.filter((m) => !inSession.has(m.id));

  return (
    <div className="space-y-6">
      <Link className="back-link" to={`/admin/sesiones?semana=${mondayOf(session.day)}`}>← Semana</Link>

      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="page-title">{session.class_name}</h1>
          <p className="page-lead">
            {formatDate(session.day, { year: "numeric" })}, a las {formatTime(session.start_time)}.{" "}
            {session.duration_min} min{session.instructor ? ` con ${session.instructor}` : ""}.
          </p>
          {session.cancelled && (
            <p className="mt-1 font-medium text-danger">
              Sesión cancelada{session.cancel_reason === "closed" ? " (día cerrado en el calendario)" : ""}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <button
            className="btn-secondary"
            type="button"
            onClick={() =>
              downloadCsv(
                `${session.class_name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${session.day}-${formatTime(session.start_time).replace(":", "")}.csv`,
                [["Nombre", "Email", "Teléfono", "Estado"],
                  ...participants.filter((p) => p.status !== "cancelled")
                    .map((p) => [p.profiles.name, p.profiles.email, p.profiles.phone, STATUS_LABELS[p.status]])],
              )
            }
          >
            Descargar lista (Excel)
          </button>
          {session.cancel_reason !== "closed" && (
            session.cancelled ? (
              <ActionButton action={() => rpc("admin_set_cancelled", { p_session_id: id, p_cancelled: false }).then(() => undefined)} onDone={reload}>
                Reabrir sesión
              </ActionButton>
            ) : (
              <ActionButton
                className="btn-danger"
                confirm="¿Cancelar esta sesión? Los socios apuntados dejarán de verla como reservada."
                action={() => rpc("admin_set_cancelled", { p_session_id: id, p_cancelled: true }).then(() => undefined)}
                onDone={reload}
              >
                Cancelar sesión
              </ActionButton>
            )
          )}
        </div>
      </div>

      <section className="card">
        <ActionForm
          onDone={reload}
          className="flex flex-wrap items-end gap-3"
          action={async (form) => {
            await rpc("admin_set_capacity", { p_session_id: id, p_capacity: intField(form, "capacity", "Aforo", 1) });
            return "Aforo guardado.";
          }}
        >
          <div>
            <label className="label" htmlFor="capacity">Aforo de esta sesión</label>
            <input className="input w-28" id="capacity" name="capacity" type="number" min={1} defaultValue={session.capacity} key={session.capacity} />
          </div>
          <button className="btn-secondary" type="submit">Guardar aforo</button>
          <span className="flex flex-col gap-1.5 pb-1 md:ml-auto md:items-end">
            <CapacityMeter capacity={session.capacity} booked={booked.length} />
            <span className="text-sm text-muted">
              <span className="font-semibold text-ink">{booked.length} apuntados</span>, {Math.max(session.capacity - booked.length, 0)} plazas libres
            </span>
          </span>
        </ActionForm>
      </section>

      <ParticipantTable title={`Apuntados (${booked.length})`} rows={booked} onRemove={reload} />
      {waitlist.length > 0 && <ParticipantTable title={`Lista de espera (${waitlist.length})`} rows={waitlist} onRemove={reload} numbered />}

      {!session.cancelled && (
        <section className="card">
          <h2 className="section-title mb-4">Apuntar a un socio</h2>
          {candidates.length === 0 ? <p className="text-sm text-muted">No hay más socios activos para apuntar.</p> : (
            <ActionForm
              onDone={reload}
              className="flex flex-wrap items-end gap-3"
              action={async (form) => {
                const status = await rpc<string>("admin_add_participant", {
                  p_session_id: id, p_user_id: form.get("user_id"), p_force: form.get("force") === "on",
                });
                return status === "booked" ? "Socio apuntado." : "La sesión está llena: el socio queda en lista de espera.";
              }}
            >
              <div className="min-w-64 flex-1">
                <label className="label" htmlFor="user_id">Socio</label>
                <select className="input" id="user_id" name="user_id">
                  {candidates.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.email})</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" name="force" /> Apuntar aunque esté llena</label>
              <button className="btn" type="submit">Apuntar</button>
            </ActionForm>
          )}
        </section>
      )}

      {cancelled.length > 0 && <ParticipantTable title={`Se desapuntaron (${cancelled.length})`} rows={cancelled} />}
    </div>
  );
}

function ParticipantTable({ title, rows, onRemove, numbered }: {
  title: string; rows: Participant[]; onRemove?: () => unknown; numbered?: boolean;
}) {
  return (
    <section className="card overflow-x-auto">
      <h2 className="section-title mb-3">{title}</h2>
      {rows.length === 0 ? <p className="text-sm text-muted">Nadie todavía.</p> : (
        <table className="table">
          <thead>
            <tr>{numbered && <th>#</th>}<th>Nombre</th><th>Email</th><th>Teléfono</th>{onRemove && <th></th>}</tr>
          </thead>
          <tbody>
            {rows.map((p, index) => (
              <tr key={p.id}>
                {numbered && <td>{index + 1}</td>}
                <td className="font-medium">{p.profiles.name}</td>
                <td>{p.profiles.email}</td>
                <td>{p.profiles.phone}</td>
                {onRemove && (
                  <td className="text-right">
                    <ActionButton
                      className="btn-danger"
                      confirm={`¿Desapuntar a ${p.profiles.name}?`}
                      action={() => rpc("admin_remove_participant", { p_booking_id: p.id }).then(() => undefined)}
                      onDone={onRemove}
                    >
                      Desapuntar
                    </ActionButton>
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
