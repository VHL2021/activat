import { Link } from "react-router";
import { CapacityMeter } from "../../components/Brand";
import { formatTime } from "../../lib/dates";
import type { SessionOverview } from "../../lib/types";

// Una sesión en los listados del administrador: hora, clase, ocupación y enlace a la lista.
export function SessionRow({ s }: { s: SessionOverview }) {
  const full = s.booked >= s.capacity;
  return (
    <li>
      <Link
        to={`/admin/sesiones/${s.id}`}
        className={`group grid grid-cols-[4.25rem_1fr] items-center gap-x-4 gap-y-2 py-3 sm:grid-cols-[4.75rem_1fr_15rem] ${s.cancelled ? "text-faint" : ""}`}
      >
        <span className={`time text-3xl leading-none ${s.cancelled ? "line-through" : ""}`}>{formatTime(s.start_time)}</span>
        <span className="min-w-0">
          <span className="block font-semibold group-hover:underline group-hover:decoration-sky group-hover:decoration-2 group-hover:underline-offset-4">
            {s.class_name}
          </span>
          <span className="block text-sm text-muted">
            {s.cancelled ? "Cancelada" : `${s.duration_min} min${s.instructor ? `, con ${s.instructor}` : ""}`}
          </span>
        </span>
        {!s.cancelled && (
          <span className="col-start-2 flex flex-col gap-1 sm:col-start-3">
            <CapacityMeter capacity={s.capacity} booked={s.booked} />
            <span className="text-[13px] text-muted">
              <span className={`font-semibold ${full ? "text-sand-text" : "text-ink"}`}>{s.booked} de {s.capacity}</span>
              {full ? ", completa" : ""}
              {s.waitlist > 0 && `, ${s.waitlist} en espera`}
            </span>
          </span>
        )}
      </Link>
    </li>
  );
}
