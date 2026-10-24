import { useState } from "react";
import { Link } from "react-router";
import { ActionButton, ActionForm, ErrorBox, Loading } from "../../components/ActionForm";
import { Icon, PageHeader } from "../../components/Brand";
import { TimePicker } from "../../components/TimePicker";
import { formatTime, todayISO, WEEKDAYS } from "../../lib/dates";
import { getSettings, must, rpc, supabase } from "../../lib/supabase";
import { useData } from "../../lib/useData";

type Slot = {
  id: number;
  weekday: number;
  start_time: string;
  valid_from: string;
  valid_to: string | null;
  class_type_id: number;
  class_types: { name: string; instructor: string | null; capacity: number; duration_min: number; active: boolean };
};

// Un color por clase para distinguirlas de un vistazo en la cuadrícula.
const CLASS_COLORS = [
  "border-sky bg-sky-tint",
  "border-sand-deep bg-sand-tint",
  "border-[#8fbfa4] bg-[#e5f2ea]",
  "border-[#c99ab4] bg-[#f6e8f0]",
  "border-[#a99bd1] bg-[#ece8f7]",
  "border-[#d9a27f] bg-[#f8eadf]",
];

export function Horario() {
  const today = todayISO();
  const { data, error, reload } = useData(async () => {
    const [slots, classes, settings] = await Promise.all([
      must(
        supabase.from("schedule_slots")
          .select("id, weekday, start_time, valid_from, valid_to, class_type_id, class_types!inner(name, instructor, capacity, duration_min, active)")
          .eq("class_types.active", true)
          .or(`valid_to.is.null,valid_to.gte.${today}`)
          .order("weekday").order("start_time"),
      ),
      must(supabase.from("class_types").select("id, name").eq("active", true).order("name")),
      getSettings(),
    ]);
    return { slots: slots as unknown as Slot[], classes: classes as { id: number; name: string }[], settings };
  });

  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  const times = [...new Set(data.slots.map((s) => formatTime(s.start_time)))].sort();
  const color = (classId: number) => CLASS_COLORS[Math.max(data.classes.findIndex((c) => c.id === classId), 0) % CLASS_COLORS.length];

  return (
    <div className="space-y-6">
      <PageHeader title="Horario semanal" lead="Cada clase del horario se repite todas las semanas, salvo en los días cerrados del calendario." />

      <section className="card overflow-x-auto p-3 sm:p-5">
        {times.length === 0 ? (
          <p className="py-8 text-center text-muted">El horario está vacío. Añade la primera clase con el formulario de abajo.</p>
        ) : (
          <table className="w-full min-w-[46rem] table-fixed border-separate border-spacing-1.5">
            <thead>
              <tr>
                <th className="w-16" />
                {WEEKDAYS.map((d) => <th key={d} className="pb-1 text-sm font-semibold text-muted">{d}</th>)}
              </tr>
            </thead>
            <tbody>
              {times.map((time) => (
                <tr key={time}>
                  <th className="time pr-1 text-right align-top text-xl leading-tight">{time}</th>
                  {WEEKDAYS.map((d, i) => {
                    const here = data.slots.filter((s) => s.weekday === i + 1 && formatTime(s.start_time) === time);
                    return (
                      <td key={d} className="align-top">
                        {here.length === 0 ? <div className="h-full min-h-14 rounded-xl border border-dashed border-line-soft" /> : here.map((slot) => (
                          <div key={slot.id} className={`group relative mb-1 rounded-xl border-l-4 px-2.5 py-2 text-sm ${color(slot.class_type_id)}`}>
                            <p className="truncate pr-5 font-semibold">{slot.class_types.name}</p>
                            <p className="truncate text-xs text-ink-soft">
                              {slot.class_types.instructor ?? `${slot.class_types.duration_min} min`}
                            </p>
                            {slot.valid_from > today && <p className="text-[11px] text-sand-text">Desde el {slot.valid_from.slice(8)}/{slot.valid_from.slice(5, 7)}</p>}
                            {slot.valid_to && <p className="text-[11px] text-sand-text">Hasta el {slot.valid_to.slice(8)}/{slot.valid_to.slice(5, 7)}</p>}
                            <span className="absolute top-1 right-1">
                              <ActionButton
                                className="flex size-6 items-center justify-center rounded-full text-muted opacity-60 hover:bg-white hover:text-danger hover:opacity-100 focus-visible:opacity-100"
                                confirm={`¿Quitar ${slot.class_types.name} de los ${WEEKDAYS[i].toLowerCase()} a las ${time}? Las sesiones futuras sin reservas se borrarán; las que tengan reservas se mantienen.`}
                                action={() => rpc("admin_remove_slot", { p_id: slot.id }).then(() => undefined)}
                                onDone={reload}
                              >
                                <Icon name="x" className="size-3.5" />
                                <span className="sr-only">Quitar</span>
                              </ActionButton>
                            </span>
                          </div>
                        ))}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <section className="card">
          <h2 className="section-title mb-4">Añadir al horario</h2>
          {data.classes.length === 0 ? (
            <p className="text-sm text-muted">Primero crea alguna clase en <Link className="link" to="/admin/clases">Clases</Link>.</p>
          ) : (
            <ActionForm
              onDone={reload}
              className="grid gap-5"
              action={async (form) => {
                const weekdays = form.getAll("weekdays").map(Number);
                if (weekdays.length === 0) throw new Error("Elige al menos un día.");
                const time = String(form.get("start_time"));
                if (!time) throw new Error("Elige la hora.");
                await must(supabase.from("schedule_slots").insert(weekdays.map((weekday) => ({
                  class_type_id: Number(form.get("class_type_id")), weekday, start_time: time, valid_from: form.get("valid_from"),
                }))));
                return `Añadida al horario (${weekdays.length} día(s) a la semana).`;
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="class_type_id">Clase</label>
                  <select className="input" id="class_type_id" name="class_type_id" required>
                    {data.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="valid_from">Empieza el</label>
                  <input className="input" id="valid_from" name="valid_from" type="date" required defaultValue={today} />
                </div>
              </div>
              <div>
                <span className="label">Hora</span>
                <TimePicker name="start_time" slots={data.settings.time_slots} />
              </div>
              <div>
                <span className="label">Días de la semana</span>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((day, index) => (
                    <label key={day} className="cursor-pointer">
                      <input className="peer sr-only" type="checkbox" name="weekdays" value={index + 1} />
                      <span className="chip peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-sky-deep">
                        {day}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <button className="btn justify-self-start" type="submit">Añadir al horario</button>
            </ActionForm>
          )}
        </section>

        <TimeSlotsEditor slots={data.settings.time_slots ?? []} onDone={reload} />
      </div>
    </div>
  );
}

// Horas habituales: salen como botones al añadir clases al horario y al crear sesiones puntuales.
function TimeSlotsEditor({ slots, onDone }: { slots: string[]; onDone: () => unknown }) {
  const [list, setList] = useState(slots);
  const [time, setTime] = useState("");
  const changed = list.join() !== slots.join();
  return (
    <section className="card">
      <h2 className="section-title">Horas habituales</h2>
      <p className="mt-1 mb-4 text-sm text-muted">Aparecen como botones al elegir la hora. Añade o quita las que uses.</p>
      <ActionForm
        onDone={onDone}
        className="grid gap-4"
        action={async () => {
          await must(supabase.from("settings").update({ time_slots: list }).eq("id", true));
          return "Horas guardadas.";
        }}
      >
        <div className="flex flex-wrap gap-1.5">
          {list.map((t) => (
            <span key={t} className="chip gap-1 pr-1.5 tabular-nums">
              {t}
              <button type="button" className="rounded-full p-0.5 text-muted hover:bg-danger-tint hover:text-danger" aria-label={`Quitar ${t}`}
                onClick={() => setList(list.filter((x) => x !== t))}>
                <Icon name="x" className="size-3.5" />
              </button>
            </span>
          ))}
          {list.length === 0 && <p className="text-sm text-faint">Ninguna hora.</p>}
        </div>
        <div className="flex gap-2">
          <input className="input w-36" type="time" aria-label="Nueva hora" value={time} onChange={(e) => setTime(e.target.value)} />
          <button type="button" className="btn-secondary" disabled={!time || list.includes(time)}
            onClick={() => { setList([...list, time].sort()); setTime(""); }}>
            <Icon name="plus" /> Añadir
          </button>
        </div>
        <button className="btn justify-self-start" type="submit" disabled={!changed}>Guardar horas</button>
      </ActionForm>
    </section>
  );
}
