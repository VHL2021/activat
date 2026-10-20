import { ActionForm } from "@/components/action-form";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { updateSettings } from "./actions";

export default async function AjustesPage() {
  await requireAdmin();
  const s = await getSettings();

  const numberField = (name: keyof typeof s, label: string, unit: string, help: string, min = 0) => (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <div className="flex items-center gap-2">
        <input className="input w-28" id={name} name={name} type="number" min={min} required defaultValue={Number(s[name])} />
        <span className="text-sm text-slate-600">{unit}</span>
      </div>
      <p className="mt-1 text-xs text-slate-500">{help}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Ajustes de reservas</h1>
        <p className="text-sm text-slate-600">Estas reglas se aplican cuando los socios se apuntan o se desapuntan.</p>
      </div>
      <section className="card">
        <ActionForm action={updateSettings} className="grid gap-6 md:grid-cols-2">
          {numberField("maxDaysAhead", "Antelación máxima para reservar", "días", "Con cuántos días de antelación se puede reservar una clase.", 1)}
          {numberField("bookingCloseMinutes", "Cierre de reservas", "minutos antes", "A partir de este momento ya no se puede apuntar nadie.")}
          {numberField("cancelDeadlineMinutes", "Plazo para desapuntarse", "minutos antes", "Después de este plazo el socio ya no puede desapuntarse.")}
          {numberField("maxActiveBookings", "Reservas activas por socio", "reservas", "Cuántas clases futuras puede tener reservadas a la vez. 0 = sin límite.")}
          {numberField("maxPerDay", "Clases por día y socio", "clases", "Cuántas clases puede reservar un socio el mismo día. 0 = sin límite.")}
          {numberField("defaultCapacity", "Aforo por defecto", "personas", "Aforo que se propone al crear una clase nueva.", 1)}
          <label className="flex items-start gap-2 text-sm md:col-span-2">
            <input type="checkbox" name="waitlistEnabled" defaultChecked={s.waitlistEnabled} className="mt-1" />
            <span>
              <span className="font-medium">Lista de espera</span>
              <span className="block text-xs text-slate-500">
                Si una clase está llena, el socio puede ponerse en espera. Cuando alguien se desapunta, entra el primero de la lista.
              </span>
            </span>
          </label>
          <div className="md:col-span-2">
            <button className="btn" type="submit">Guardar ajustes</button>
          </div>
        </ActionForm>
      </section>
    </div>
  );
}
