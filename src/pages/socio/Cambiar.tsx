import { Link, useNavigate, useParams } from "react-router";
import { ActionButton, ErrorBox, Loading } from "../../components/ActionForm";
import { addDays, formatDate, formatTime, todayISO } from "../../lib/dates";
import { getSettings, rpc } from "../../lib/supabase";
import type { MemberSession } from "../../lib/types";
import { useData } from "../../lib/useData";

export function Cambiar() {
  const fromId = Number(useParams().id);
  const navigate = useNavigate();
  const today = todayISO();
  const { data, error } = useData(async () => {
    const settings = await getSettings();
    const last = addDays(today, settings.max_days_ahead);
    await rpc("ensure_sessions", { p_from: today, p_to: last });
    return { settings, sessions: await rpc<MemberSession[]>("member_sessions", { p_from: today, p_to: last }) };
  }, [fromId]);

  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  const current = data.sessions.find((s) => s.id === fromId && s.my_status === "booked");
  if (!current) return <p className="text-slate-600">Esa reserva ya no existe. <Link className="link" to="/socio/mis-clases">Volver a mis clases</Link></p>;
  const options = data.sessions.filter(
    (s) => !s.my_status && !s.cancelled && s.booked < s.capacity && s.minutes_until >= data.settings.booking_close_minutes,
  );

  return (
    <div className="space-y-6">
      <Link className="link text-sm" to="/socio/mis-clases">← Volver a mis clases</Link>
      <div>
        <h1 className="text-2xl font-semibold">Cambiar de clase</h1>
        <p className="text-sm text-slate-600">
          Ahora: {current.class_name}, {formatDate(current.day).toLowerCase()} a las {formatTime(current.start_time)}.
          Elige la nueva clase; solo aparecen las que tienen plazas libres.
        </p>
      </div>
      {options.length === 0 ? <p className="text-slate-600">No hay otras clases con plazas libres en los próximos días.</p> : (
        <ul className="space-y-2">
          {options.map((s) => (
            <li key={s.id} data-option={s.id} className="card flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-semibold">{formatDate(s.day)} · {formatTime(s.start_time)}</div>
                <div className="text-sm text-slate-600">
                  {s.class_name}{s.instructor ? ` · ${s.instructor}` : ""} · {s.capacity - s.booked} plazas libres
                </div>
              </div>
              <ActionButton
                className="btn"
                action={() => rpc("switch_booking", { p_from: current.id, p_to: s.id }).then(() => undefined)}
                onDone={() => navigate("/socio/mis-clases?cambio=1")}
              >
                Cambiar a esta
              </ActionButton>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
