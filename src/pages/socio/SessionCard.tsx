import { Link } from "react-router";
import { ActionButton } from "../../components/ActionForm";
import { Avatar, Icon } from "../../components/Brand";
import { useAuth } from "../../lib/auth";
import { formatMinutes, formatTime } from "../../lib/dates";
import { rpc } from "../../lib/supabase";
import type { MemberSession, Settings } from "../../lib/types";

// Las plazas de la clase como casillas: la tuya con tu foto, las ocupadas con una silueta y las libres vacías.
// No se enseñan fotos ni nombres de otros socios: cada uno solo ve lo suyo.
function Places({ s }: { s: MemberSession }) {
  const { profile } = useAuth();
  const mine = s.my_status === "booked";
  const others = Math.max(Math.min(s.booked, s.capacity) - (mine ? 1 : 0), 0);
  const tile = s.capacity > 16 ? "size-8 rounded-lg" : "size-11 rounded-xl";
  return (
    <div className="flex flex-wrap gap-1.5" role="img" aria-label={`${s.booked} de ${s.capacity} plazas ocupadas`}>
      {mine && profile && <Avatar name={profile.name} src={profile.avatar} className={`${tile} ring-2 ring-sand !rounded-xl text-xs`} />}
      {Array.from({ length: others }, (_, i) => (
        <span key={`o${i}`} className={`${tile} flex items-center justify-center bg-sky-tint text-sky`}>
          <Icon name="user" className="size-1/2" />
        </span>
      ))}
      {Array.from({ length: Math.max(s.capacity - s.booked, 0) }, (_, i) => (
        <span key={`f${i}`} className={`${tile} border-2 border-dashed border-line`} />
      ))}
    </div>
  );
}

// Una clase con sus plazas y el botón que corresponde según la reserva del socio y las reglas.
export function SessionCard({ s, settings, onChange }: { s: MemberSession; settings: Settings; onChange: () => unknown }) {
  const free = Math.max(s.capacity - s.booked, 0);
  const closed = s.minutes_until < settings.booking_close_minutes;
  const canLeave = s.minutes_until >= settings.cancel_deadline_minutes;
  const book = () => rpc("book_session", { p_session_id: s.id }).then(() => undefined);
  const cancel = () => rpc("cancel_booking", { p_session_id: s.id }).then(() => undefined);
  const booked = s.my_status === "booked" && !s.cancelled;

  let status: string;
  if (s.cancelled) status = "Clase cancelada";
  else if (booked) status = "Estás apuntado";
  else if (s.my_status === "waitlist") status = `En lista de espera, eres el n.º ${s.waitlist_position}`;
  else if (free > 0) status = `${free} plaza${free === 1 ? "" : "s"} libre${free === 1 ? "" : "s"}`;
  else status = s.waitlist > 0 ? `Completa, ${s.waitlist} en espera` : "Completa";

  return (
    <li
      id={`clase-${s.id}`}
      data-session={s.id}
      className={`scroll-mt-28 overflow-hidden rounded-2xl border bg-surface ${booked ? "border-sand-deep shadow-[0_0_0_3px_var(--color-sand-tint)]" : "border-line"} ${
        s.cancelled ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-4 p-4 pb-3 sm:p-5 sm:pb-3">
        <div className={`border-l-4 pl-3 ${booked ? "border-sand-deep" : "border-sky"}`}>
          <h3 className={`font-display text-2xl leading-tight font-black ${s.cancelled ? "line-through" : ""}`}>{s.class_name}</h3>
          <p className="text-sm text-muted">{s.instructor ? `Con ${s.instructor}, ` : ""}{s.duration_min} min</p>
        </div>
        <span className="time text-3xl leading-none sm:text-4xl">{formatTime(s.start_time)}</span>
      </div>

      {!s.cancelled && <div className="px-4 pb-4 sm:px-5"><Places s={s} /></div>}

      <div className={`flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 sm:px-5 ${booked ? "border-sand-tint bg-sand-tint" : "border-line-soft"}`}>
        <span className={`flex items-center gap-1.5 text-sm font-semibold ${booked ? "text-sand-text" : "text-ink-soft"}`}>
          {booked && <Icon name="check" />}
          {s.my_status === "waitlist" && <Icon name="clock" />}
          {status}
        </span>
        {!s.cancelled && (
          <div className="flex flex-wrap gap-2">
            {s.my_status === "booked" && (canLeave ? (
              <>
                <Link className="btn-secondary" to={`/socio/cambiar/${s.id}`}>Cambiar</Link>
                <ActionButton className="btn-danger" action={cancel} onDone={onChange}>Desapuntarme</ActionButton>
              </>
            ) : (
              <p className="max-w-52 text-xs text-muted">Ya no puedes desapuntarte (plazo: {formatMinutes(settings.cancel_deadline_minutes)} antes)</p>
            ))}
            {s.my_status === "waitlist" && <ActionButton action={cancel} onDone={onChange}>Salir de la lista</ActionButton>}
            {!s.my_status && (closed ? (
              <span className="text-xs text-muted">Reservas cerradas</span>
            ) : free > 0 ? (
              <ActionButton className="btn" action={book} onDone={onChange}>Apuntarme</ActionButton>
            ) : settings.waitlist_enabled ? (
              <ActionButton action={book} onDone={onChange}>Ponerme en espera</ActionButton>
            ) : null)}
          </div>
        )}
      </div>
    </li>
  );
}
