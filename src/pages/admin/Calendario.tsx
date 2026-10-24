import { useState } from "react";
import { ActionButton, ActionForm, ErrorBox, Loading } from "../../components/ActionForm";
import { formatDate, todayISO } from "../../lib/dates";
import { must, rpc, supabase } from "../../lib/supabase";
import type { ClosedDay } from "../../lib/types";
import { useData } from "../../lib/useData";

const KIND_LABELS: Record<string, string> = { festivo: "Festivo", vacaciones: "Vacaciones", otro: "Otro" };

export function Calendario() {
  const [includePast, setIncludePast] = useState(false);
  const { data: days, error, reload } = useData(async () => {
    let q = supabase.from("closed_days").select().order("day");
    if (!includePast) q = q.gte("day", todayISO());
    return (await must(q)) as ClosedDay[];
  }, [includePast]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Calendario</h1>
        <p className="page-lead">
          Los días cerrados no tienen clases. Si ya había sesiones ese día, se cancelan automáticamente.
        </p>
      </div>

      <section className="card">
        <h2 className="section-title mb-4">Marcar días cerrados</h2>
        <ActionForm
          resetOnSuccess
          onDone={reload}
          className="grid gap-4 md:grid-cols-5 md:items-end"
          action={async (data) => {
            const from = String(data.get("from"));
            const to = String(data.get("to")) || from;
            const r = await rpc<{ days: number; sessions: number; bookings: number }>("admin_add_closed_days", {
              p_from: from, p_to: to, p_kind: data.get("kind"), p_reason: data.get("reason"),
            });
            return `Guardado: ${r.days} día(s) cerrado(s).` +
              (r.sessions ? ` Se han cancelado ${r.sessions} sesión(es) con ${r.bookings} reserva(s).` : "");
          }}
        >
          <div>
            <label className="label" htmlFor="from">Desde</label>
            <input className="input" id="from" name="from" type="date" required />
          </div>
          <div>
            <label className="label" htmlFor="to">Hasta (opcional)</label>
            <input className="input" id="to" name="to" type="date" />
          </div>
          <div>
            <label className="label" htmlFor="kind">Tipo</label>
            <select className="input" id="kind" name="kind" defaultValue="festivo">
              <option value="festivo">Festivo</option>
              <option value="vacaciones">Vacaciones</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="reason">Motivo</label>
            <input className="input" id="reason" name="reason" placeholder="Ej.: Navidad" />
          </div>
          <button className="btn" type="submit">Guardar</button>
        </ActionForm>
      </section>

      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="section-title">{includePast ? "Todos los días cerrados" : "Próximos días cerrados"}</h2>
          <button className="link text-sm" type="button" onClick={() => setIncludePast(!includePast)}>
            {includePast ? "Ver solo los próximos" : "Ver también los pasados"}
          </button>
        </div>
        <ErrorBox error={error} />
        {!days ? <Loading /> : days.length === 0 ? (
          <p className="text-sm text-muted">No hay días cerrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>Fecha</th><th>Tipo</th><th>Motivo</th><th></th></tr></thead>
              <tbody>
                {days.map((day) => (
                  <tr key={day.id}>
                    <td>{formatDate(day.day, { year: "numeric" })}</td>
                    <td>{KIND_LABELS[day.kind]}</td>
                    <td>{day.reason}</td>
                    <td className="text-right">
                      <ActionButton
                        className="btn-danger"
                        confirm="¿Quitar este día cerrado? Las sesiones de ese día se reabrirán."
                        action={() => rpc("admin_delete_closed_day", { p_id: day.id })}
                        onDone={reload}
                      >
                        Quitar
                      </ActionButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
