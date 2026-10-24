import { Link } from "react-router";
import { ActionButton } from "../../components/ActionForm";
import { formatMinutes, formatTime } from "../../lib/dates";
import { rpc } from "../../lib/supabase";
import type { MemberSession, Settings } from "../../lib/types";

// Una clase con sus plazas y el botón que corresponde según la reserva del socio y las reglas.
export function SessionCard({ s, settings, onChange }: { s: MemberSession; settings: Settings; onChange: () => unknown }) {
  const free = Math.max(s.capacity - s.booked, 0);
  const closed = s.minutes_until < settings.booking_close_minutes;
  const canLeave = s.minutes_until >= settings.cancel_deadline_minutes;
  const book = () => rpc("book_session", { p_session_id: s.id }).then(() => undefined);
  const cancel = () => rpc("cancel_booking", { p_session_id: s.id }).then(() => undefined);

  let badge: { text: string; className: string } | null = null;
  if (s.cancelled) badge = { text: "Cancelada", className: "bg-red-100 text-red-800" };
  else if (s.my_status === "booked") badge = { text: "Apuntado", className: "bg-emerald-100 text-emerald-800" };
  else if (s.my_status === "waitlist") badge = { text: `En espera (n.º ${s.waitlist_position})`, className: "bg-amber-100 text-amber-800" };

  return (
    <li data-session={s.id} className={`card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${s.cancelled ? "opacity-60" : ""}`}>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{formatTime(s.start_time)} · {s.class_name}</span>
          {badge && <span className={`rounded px-2 py-0.5 text-xs font-medium ${badge.className}`}>{badge.text}</span>}
        </div>
        <div className="text-sm text-slate-600">
          {s.duration_min} min{s.instructor ? ` · ${s.instructor}` : ""}
          {!s.cancelled && <> · {free > 0 ? `${free} plaza${free === 1 ? "" : "s"} libre${free === 1 ? "" : "s"}` : "Completa"}</>}
        </div>
      </div>

      {!s.cancelled && (
        <div className="sm:text-right">
          {s.my_status === "booked" && (canLeave ? (
            <div className="flex flex-wrap items-start gap-2 sm:justify-end">
              <Link className="btn-secondary" to={`/socio/cambiar/${s.id}`}>Cambiar</Link>
              <ActionButton className="btn-danger" action={cancel} onDone={onChange}>Desapuntarme</ActionButton>
            </div>
          ) : (
            <p className="text-xs text-slate-500">Ya no puedes desapuntarte (plazo: {formatMinutes(settings.cancel_deadline_minutes)} antes)</p>
          ))}
          {s.my_status === "waitlist" && <ActionButton action={cancel} onDone={onChange}>Salir de la lista</ActionButton>}
          {!s.my_status && (closed ? (
            <p className="text-xs text-slate-500">Reservas cerradas</p>
          ) : free > 0 ? (
            <ActionButton className="btn" action={book} onDone={onChange}>Apuntarme</ActionButton>
          ) : settings.waitlist_enabled ? (
            <ActionButton action={book} onDone={onChange}>Lista de espera</ActionButton>
          ) : null)}
        </div>
      )}
    </li>
  );
}
