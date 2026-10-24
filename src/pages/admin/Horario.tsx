import { Link } from "react-router";
import { ActionButton, ActionForm, ErrorBox, Loading } from "../../components/ActionForm";
import { formatTime, todayISO, WEEKDAYS } from "../../lib/dates";
import { must, rpc, supabase } from "../../lib/supabase";
import { useData } from "../../lib/useData";

type Slot = {
  id: number;
  weekday: number;
  start_time: string;
  valid_from: string;
  valid_to: string | null;
  class_types: { name: string; instructor: string | null; capacity: number; duration_min: number; active: boolean };
};

export function Horario() {
  const today = todayISO();
  const { data, error, reload } = useData(async () => {
    const [slots, classes] = await Promise.all([
      must(
        supabase.from("schedule_slots")
          .select("id, weekday, start_time, valid_from, valid_to, class_types!inner(name, instructor, capacity, duration_min, active)")
          .eq("class_types.active", true)
          .or(`valid_to.is.null,valid_to.gte.${today}`)
          .order("weekday").order("start_time"),
      ),
      must(supabase.from("class_types").select("id, name").eq("active", true).order("name")),
    ]);
    return { slots: slots as unknown as Slot[], classes: classes as { id: number; name: string }[] };
  });

  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Horario semanal</h1>
        <p className="text-sm text-slate-600">Cada clase del horario se repite todas las semanas, salvo en los días cerrados del calendario.</p>
      </div>

      <section className="card">
        <h2 className="mb-4 font-semibold">Añadir al horario</h2>
        {data.classes.length === 0 ? (
          <p className="text-sm text-slate-600">Primero crea alguna clase en <Link className="link underline" to="/admin/clases">Clases</Link>.</p>
        ) : (
          <ActionForm
            onDone={reload}
            className="space-y-4"
            action={async (form) => {
              const weekdays = form.getAll("weekdays").map(Number);
              if (weekdays.length === 0) throw new Error("Elige al menos un día.");
              const time = String(form.get("start_time"));
              if (!time) throw new Error("Escribe la hora (por ejemplo 18:30).");
              await must(supabase.from("schedule_slots").insert(weekdays.map((weekday) => ({
                class_type_id: Number(form.get("class_type_id")), weekday, start_time: time, valid_from: form.get("valid_from"),
              }))));
              return `Añadida al horario (${weekdays.length} día(s) a la semana).`;
            }}
          >
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="label" htmlFor="class_type_id">Clase</label>
                <select className="input" id="class_type_id" name="class_type_id" required>
                  {data.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="start_time">Hora de inicio</label>
                <input className="input" id="start_time" name="start_time" type="time" required />
              </div>
              <div>
                <label className="label" htmlFor="valid_from">Empieza el</label>
                <input className="input" id="valid_from" name="valid_from" type="date" required defaultValue={today} />
              </div>
            </div>
            <div>
              <span className="label">Días de la semana</span>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {WEEKDAYS.map((day, index) => (
                  <label key={day} className="flex items-center gap-1.5 text-sm">
                    <input type="checkbox" name="weekdays" value={index + 1} /> {day}
                  </label>
                ))}
              </div>
            </div>
            <button className="btn" type="submit">Añadir</button>
          </ActionForm>
        )}
      </section>

      <section className="grid gap-3 md:grid-cols-4 lg:grid-cols-7">
        {WEEKDAYS.map((day, index) => {
          const slots = data.slots.filter((s) => s.weekday === index + 1);
          return (
            <div key={day} className="card p-3">
              <h3 className="mb-2 font-semibold">{day}</h3>
              {slots.length === 0 && <p className="text-xs text-slate-500">Sin clases</p>}
              <ul className="space-y-2">
                {slots.map((slot) => (
                  <li key={slot.id} className="rounded-md bg-slate-50 p-2 text-sm">
                    <div className="font-medium">{formatTime(slot.start_time)} · {slot.class_types.name}</div>
                    <div className="text-xs text-slate-600">
                      {slot.class_types.duration_min} min · {slot.class_types.capacity} plazas
                      {slot.class_types.instructor ? ` · ${slot.class_types.instructor}` : ""}
                    </div>
                    {slot.valid_from > today && <div className="text-xs text-amber-700">Empieza el {slot.valid_from}</div>}
                    {slot.valid_to && <div className="text-xs text-amber-700">Hasta el {slot.valid_to}</div>}
                    <ActionButton
                      className="mt-1 text-xs text-red-700 hover:underline"
                      confirm="¿Quitar esta clase del horario? Las sesiones futuras sin reservas se borrarán; las que tengan reservas se mantienen."
                      action={() => rpc("admin_remove_slot", { p_id: slot.id }).then(() => undefined)}
                      onDone={reload}
                    >
                      Quitar
                    </ActionButton>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>
    </div>
  );
}
