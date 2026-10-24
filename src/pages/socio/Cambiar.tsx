import { Link, useNavigate, useParams } from "react-router";
import { ActionButton, ErrorBox, Loading } from "../../components/ActionForm";
import { CapacityMeter, PageHeader } from "../../components/Brand";
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
  if (!current) return <p className="text-muted">Esa reserva ya no existe. <Link className="link" to="/socio/mis-clases">Volver a mis clases</Link></p>;
  const options = data.sessions.filter(
    (s) => !s.my_status && !s.cancelled && s.booked < s.capacity && s.minutes_until >= data.settings.booking_close_minutes,
  );

  return (
    <div className="space-y-6">
      <Link className="back-link" to="/socio/mis-clases">← Mis clases</Link>
      <PageHeader
        title="Cambiar de clase"
        lead="Elige la nueva clase. Solo aparecen las que tienen plazas libres, y no pierdes tu plaza actual hasta que el cambio se hace."
      />
      <div className="flex items-center gap-4 rounded-2xl bg-ink p-4 text-white">
        <span className="time text-4xl leading-none text-sand">{formatTime(current.start_time)}</span>
        <div>
          <div className="text-sm text-white/70">Ahora estás en</div>
          <div className="font-semibold">{current.class_name}, {formatDate(current.day).toLowerCase()}</div>
        </div>
      </div>
      {options.length === 0 ? <p className="notice">No hay otras clases con plazas libres en los próximos días.</p> : (
        <ul className="space-y-3">
          {options.map((s) => (
            <li key={s.id} data-option={s.id} className="card flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <span className="time w-20 shrink-0 text-4xl leading-[0.85]">{formatTime(s.start_time)}</span>
                <div>
                  <div className="font-semibold">{s.class_name}</div>
                  <div className="text-sm text-muted">{formatDate(s.day)}{s.instructor ? `, con ${s.instructor}` : ""}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <CapacityMeter capacity={s.capacity} booked={s.booked} />
                    <span className="text-[13px] font-semibold">{s.capacity - s.booked} plazas libres</span>
                  </div>
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
