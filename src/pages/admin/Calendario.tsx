import { useState } from "react";
import { ActionButton, ActionForm, ErrorBox, Loading } from "../../components/ActionForm";
import { PageHeader } from "../../components/Brand";
import { DatePicker } from "../../components/DatePicker";
import { formatDate, todayISO } from "../../lib/dates";
import { must, rpc, supabase } from "../../lib/supabase";
import type { ClosedDay } from "../../lib/types";
import { useData } from "../../lib/useData";

const KINDS: Record<string, { label: string; cell: string; dot: string }> = {
  festivo: { label: "Festivo", cell: "!bg-sand-tint !border-sand-deep", dot: "bg-sand-deep" },
  vacaciones: { label: "Vacaciones", cell: "!bg-sky-tint !border-sky", dot: "bg-sky" },
  otro: { label: "Otro", cell: "!bg-line-soft !border-faint", dot: "bg-faint" },
};

export function Calendario() {
  const today = todayISO();
  const [includePast, setIncludePast] = useState(false);
  const [range, setRange] = useState<{ from: string | null; to: string | null }>({ from: null, to: null });
  const { data: days, error, reload } = useData(async () => (await must(supabase.from("closed_days").select().order("day"))) as ClosedDay[]);

  const closedOn = (d: string) => days?.find((c) => c.day === d);
  const list = (days ?? []).filter((d) => includePast || d.day >= today);

  return (
    <div className="space-y-6">
      <PageHeader title="Calendario" lead="Los días cerrados no tienen clases. Si ya había sesiones ese día, se cancelan automáticamente." />
      <ErrorBox error={error} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,26rem)_1fr]">
        <section className="card">
          <h2 className="section-title mb-4">Marcar días cerrados</h2>
          <ActionForm
            onDone={async () => { setRange({ from: null, to: null }); await reload(); }}
            className="grid gap-4"
            action={async (data) => {
              if (!range.from) throw new Error("Elige el día en el calendario.");
              const r = await rpc<{ days: number; sessions: number; bookings: number }>("admin_add_closed_days", {
                p_from: range.from, p_to: range.to ?? range.from, p_kind: data.get("kind"), p_reason: data.get("reason"),
              });
              return `Guardado: ${r.days} día(s) cerrado(s).` +
                (r.sessions ? ` Se han cancelado ${r.sessions} sesión(es) con ${r.bookings} reserva(s).` : "");
            }}
          >
            <DatePicker
              name="from"
              endName="to"
              min={today}
              value={range}
              onChange={setRange}
              marks={(d) => { const c = closedOn(d); return c ? KINDS[c.kind]?.cell ?? "" : ""; }}
            />
            <div>
              <span className="label">Tipo</span>
              <div className="flex flex-wrap gap-2">
                {Object.entries(KINDS).map(([value, k]) => (
                  <label key={value} className="cursor-pointer">
                    <input className="peer sr-only" type="radio" name="kind" value={value} defaultChecked={value === "festivo"} />
                    <span className="chip gap-2 peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-sky-deep">
                      <span className={`size-2.5 rounded-full ${k.dot}`} />{k.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="label" htmlFor="reason">Motivo</label>
              <input className="input" id="reason" name="reason" placeholder="Ej.: Navidad" />
            </div>
            <button className="btn justify-self-start" type="submit" disabled={!range.from}>Marcar como cerrado</button>
          </ActionForm>
        </section>

        <section className="card">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="section-title">{includePast ? "Todos los días cerrados" : "Próximos días cerrados"}</h2>
            <button className="link text-sm" type="button" onClick={() => setIncludePast(!includePast)}>
              {includePast ? "Ver solo los próximos" : "Ver también los pasados"}
            </button>
          </div>
          {!days ? <Loading /> : list.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">No hay días cerrados. Elige uno en el calendario para marcarlo.</p>
          ) : (
            <ul className="divide-y divide-line-soft">
              {list.map((day) => (
                <li key={day.id} className={`flex items-center gap-4 py-3 ${day.day < today ? "opacity-50" : ""}`}>
                  <span className={`size-3 shrink-0 rounded-full ${KINDS[day.kind]?.dot}`} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{formatDate(day.day, { year: "numeric" })}</p>
                    <p className="text-sm text-muted">{KINDS[day.kind]?.label}{day.reason ? `: ${day.reason}` : ""}</p>
                  </div>
                  <ActionButton
                    className="btn-danger"
                    confirm="¿Quitar este día cerrado? Las sesiones de ese día se reabrirán."
                    action={() => rpc("admin_delete_closed_day", { p_id: day.id })}
                    onDone={reload}
                  >
                    Quitar
                  </ActionButton>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
