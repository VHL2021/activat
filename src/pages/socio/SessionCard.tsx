import { Link } from "react-router";
import { ActionButton } from "../../components/ActionForm";
import { CapacityMeter } from "../../components/Brand";
import { formatMinutes, formatTime } from "../../lib/dates";
import { rpc } from "../../lib/supabase";
import type { MemberSession, Settings } from "../../lib/types";

// Una clase con sus plazas y el botón que corresponde según la reserva del socio y las reglas.
// Si el socio está apuntado, la tarjeta se "enciende" (fondo oscuro) para verla de un vistazo.
export function SessionCard({ s, settings, onChange }: { s: MemberSession; settings: Settings; onChange: () => unknown }) {
  const free = Math.max(s.capacity - s.booked, 0);
  const closed = s.minutes_until < settings.booking_close_minutes;
  const canLeave = s.minutes_until >= settings.cancel_deadline_minutes;
  const book = () => rpc("book_session", { p_session_id: s.id }).then(() => undefined);
  const cancel = () => rpc("cancel_booking", { p_session_id: s.id }).then(() => undefined);
  const on = s.my_status === "booked" && !s.cancelled;

  let badge: { text: string; className: string } | null = null;
  if (s.cancelled) badge = { text: "Cancelada", className: "bg-danger-tint text-danger" };
  else if (s.my_status === "booked") badge = { text: "Apuntado", className: "bg-brand text-ink" };
  else if (s.my_status === "waitlist") badge = { text: `En espera, n.º ${s.waitlist_position}`, className: "bg-brand-tint text-brand-text" };

  const quiet = on ? "text-white/70" : "text-muted";

  return (
    <li
      data-session={s.id}
      className={`grid grid-cols-[4.75rem_1fr] gap-x-3 gap-y-3 rounded-2xl border p-4 sm:grid-cols-[6.5rem_1fr_auto] sm:items-center sm:p-5 ${
        on ? "border-ink bg-ink text-white" : "border-line bg-surface"
      } ${s.cancelled ? "opacity-60" : ""}`}
    >
      <div className="row-span-2 sm:row-span-1">
        <div className={`time text-[2.35rem] leading-[0.8] sm:text-5xl ${on ? "text-brand" : ""} ${s.cancelled ? "line-through" : ""}`}>
          {formatTime(s.start_time)}
        </div>
        <div className={`mt-1.5 text-[13px] font-medium ${quiet}`}>{s.duration_min} min</div>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-lg leading-tight font-semibold">{s.class_name}</span>
          {badge && <span className={`tag ${badge.className}`}>{badge.text}</span>}
        </div>
        {s.instructor && <div className={`text-sm ${quiet}`}>Con {s.instructor}</div>}
        {!s.cancelled && (
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <CapacityMeter capacity={s.capacity} booked={s.booked} tone={on ? "light" : "dark"} />
            <span className={`text-[13px] font-semibold ${free > 0 ? (on ? "text-white" : "text-ink") : quiet}`}>
              {free > 0 ? `${free} plaza${free === 1 ? "" : "s"} libre${free === 1 ? "" : "s"}` : "Completa"}
              {s.waitlist > 0 && <span className={`font-normal ${quiet}`}>, {s.waitlist} en espera</span>}
            </span>
          </div>
        )}
      </div>

      {!s.cancelled && (
        <div className="col-start-2 sm:col-start-3 sm:text-right">
          {s.my_status === "booked" && (canLeave ? (
            <div className="flex flex-wrap items-start gap-2 sm:justify-end">
              <Link className="btn-secondary border-white/30 bg-transparent text-white hover:border-white" to={`/socio/cambiar/${s.id}`}>Cambiar</Link>
              <ActionButton className="btn-secondary border-white/30 bg-transparent text-white hover:border-white" action={cancel} onDone={onChange}>
                Desapuntarme
              </ActionButton>
            </div>
          ) : (
            <p className="max-w-52 text-xs text-white/70 sm:ml-auto">Ya no puedes desapuntarte (plazo: {formatMinutes(settings.cancel_deadline_minutes)} antes)</p>
          ))}
          {s.my_status === "waitlist" && <ActionButton action={cancel} onDone={onChange}>Salir de la lista</ActionButton>}
          {!s.my_status && (closed ? (
            <p className="text-xs text-muted">Reservas cerradas</p>
          ) : free > 0 ? (
            <ActionButton className="btn" action={book} onDone={onChange}>Apuntarme</ActionButton>
          ) : settings.waitlist_enabled ? (
            <ActionButton action={book} onDone={onChange}>Ponerme en espera</ActionButton>
          ) : null)}
        </div>
      )}
    </li>
  );
}
