import { ActionForm, ErrorBox, Loading } from "../../components/ActionForm";
import { getSettings, intField, must, supabase } from "../../lib/supabase";
import type { Settings } from "../../lib/types";
import { useData } from "../../lib/useData";

const FIELDS: { name: keyof Settings; label: string; unit: string; help: string; min: number }[] = [
  { name: "max_days_ahead", label: "Antelación máxima para reservar", unit: "días", help: "Con cuántos días de antelación se puede reservar una clase.", min: 1 },
  { name: "booking_close_minutes", label: "Cierre de reservas", unit: "minutos antes", help: "A partir de este momento ya no se puede apuntar nadie.", min: 0 },
  { name: "cancel_deadline_minutes", label: "Plazo para desapuntarse", unit: "minutos antes", help: "Después de este plazo el socio ya no puede desapuntarse.", min: 0 },
  { name: "max_active_bookings", label: "Reservas activas por socio", unit: "reservas", help: "Cuántas clases futuras puede tener reservadas a la vez. 0 = sin límite.", min: 0 },
  { name: "max_per_day", label: "Clases por día y socio", unit: "clases", help: "Cuántas clases puede reservar un socio el mismo día. 0 = sin límite.", min: 0 },
  { name: "default_capacity", label: "Aforo por defecto", unit: "personas", help: "Aforo que se propone al crear una clase nueva.", min: 1 },
];

export function Ajustes() {
  const { data: s, error } = useData(getSettings);
  if (error) return <ErrorBox error={error} />;
  if (!s) return <Loading />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Ajustes de reservas</h1>
        <p className="page-lead">Estas reglas se aplican cuando los socios se apuntan o se desapuntan.</p>
      </div>
      <section className="card">
        <ActionForm
          className="grid gap-6 md:grid-cols-2"
          action={async (form) => {
            const values: Record<string, unknown> = { waitlist_enabled: form.get("waitlist_enabled") === "on" };
            for (const f of FIELDS) values[f.name] = intField(form, f.name, f.label, f.min);
            await must(supabase.from("settings").update(values).eq("id", true));
            return "Ajustes guardados.";
          }}
        >
          {FIELDS.map((f) => (
            <div key={f.name}>
              <label className="label" htmlFor={f.name}>{f.label}</label>
              <div className="flex items-center gap-2">
                <input className="input w-28" id={f.name} name={f.name} type="number" min={f.min} required defaultValue={Number(s[f.name])} />
                <span className="text-sm text-muted">{f.unit}</span>
              </div>
              <p className="mt-1 text-xs text-muted">{f.help}</p>
            </div>
          ))}
          <label className="flex items-start gap-2 text-sm md:col-span-2">
            <input type="checkbox" name="waitlist_enabled" defaultChecked={s.waitlist_enabled} className="mt-1" />
            <span>
              <span className="font-medium">Lista de espera</span>
              <span className="block text-xs text-muted">
                Si una clase está llena, el socio puede ponerse en espera. Cuando alguien se desapunta, entra el primero de la lista.
              </span>
            </span>
          </label>
          <div className="md:col-span-2"><button className="btn" type="submit">Guardar ajustes</button></div>
        </ActionForm>
      </section>
    </div>
  );
}
