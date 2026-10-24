import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { formatMinutes } from "@/lib/bookings";
import { formatTime } from "@/lib/dates";
import type { MemberSessionRow } from "@/lib/sessions";
import type { Settings } from "@/lib/settings";
import { bookAction, cancelAction } from "./actions";

// Una clase con sus plazas y el botón que corresponde según la reserva del socio y las reglas.
export function SessionCard({ s, settings }: { s: MemberSessionRow; settings: Settings }) {
  const free = Math.max(s.capacity - s.booked, 0);
  const closed = s.minutes_until < settings.bookingCloseMinutes;
  const canLeave = s.minutes_until >= settings.cancelDeadlineMinutes;

  let badge: { text: string; className: string } | null = null;
  if (s.cancelled) badge = { text: "Cancelada", className: "bg-red-100 text-red-800" };
  else if (s.my_status === "booked") badge = { text: "Apuntado", className: "bg-emerald-100 text-emerald-800" };
  else if (s.my_status === "waitlist") {
    badge = { text: `En espera (n.º ${s.waitlist_position})`, className: "bg-amber-100 text-amber-800" };
  }

  return (
    <li data-session={s.id} className={`card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${s.cancelled ? "opacity-60" : ""}`}>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{formatTime(s.start_time)} · {s.class_name}</span>
          {badge && <span className={`rounded px-2 py-0.5 text-xs font-medium ${badge.className}`}>{badge.text}</span>}
        </div>
        <div className="text-sm text-slate-600">
          {s.duration_min} min{s.instructor ? ` · ${s.instructor}` : ""}
          {!s.cancelled && (
            <> · {free > 0 ? `${free} plaza${free === 1 ? "" : "s"} libre${free === 1 ? "" : "s"}` : "Completa"}</>
          )}
        </div>
      </div>

      {!s.cancelled && (
        <div className="sm:text-right">
          {s.my_status === "booked" &&
            (canLeave ? (
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <Link className="btn-secondary" href={`/socio/cambiar/${s.id}`}>Cambiar</Link>
                <ActionForm action={cancelAction}>
                  <input type="hidden" name="session_id" value={s.id} />
                  <button className="btn-danger" type="submit">Desapuntarme</button>
                </ActionForm>
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                Ya no puedes desapuntarte (plazo: {formatMinutes(settings.cancelDeadlineMinutes)} antes)
              </p>
            ))}
          {s.my_status === "waitlist" && (
            <ActionForm action={cancelAction}>
              <input type="hidden" name="session_id" value={s.id} />
              <button className="btn-secondary" type="submit">Salir de la lista</button>
            </ActionForm>
          )}
          {!s.my_status &&
            (closed ? (
              <p className="text-xs text-slate-500">Reservas cerradas</p>
            ) : free > 0 ? (
              <ActionForm action={bookAction}>
                <input type="hidden" name="session_id" value={s.id} />
                <button className="btn" type="submit">Apuntarme</button>
              </ActionForm>
            ) : settings.waitlistEnabled ? (
              <ActionForm action={bookAction}>
                <input type="hidden" name="session_id" value={s.id} />
                <button className="btn-secondary" type="submit">Lista de espera</button>
              </ActionForm>
            ) : null)}
        </div>
      )}
    </li>
  );
}
