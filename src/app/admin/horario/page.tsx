import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { ConfirmButton } from "@/components/confirm-button";
import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { formatTime, todayISO, WEEKDAYS } from "@/lib/dates";
import { addSlots, removeSlot } from "./actions";

type Slot = {
  id: number;
  weekday: number;
  start_time: string;
  valid_from: string;
  valid_to: string | null;
  name: string;
  instructor: string | null;
  capacity: number;
  duration_min: number;
};

export default async function HorarioPage() {
  await requireAdmin();
  const [slots, classes] = await Promise.all([
    query<Slot>(
      `SELECT s.id, s.weekday, s.start_time, s.valid_from, s.valid_to,
         c.name, c.instructor, c.capacity, c.duration_min
       FROM schedule_slots s JOIN class_types c ON c.id = s.class_type_id
       WHERE c.active AND (s.valid_to IS NULL OR s.valid_to >= CURRENT_DATE)
       ORDER BY s.weekday, s.start_time`,
    ),
    query<{ id: number; name: string }>("SELECT id, name FROM class_types WHERE active ORDER BY name"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Horario semanal</h1>
        <p className="text-sm text-slate-600">
          Cada clase del horario se repite todas las semanas, salvo en los días cerrados del calendario.
        </p>
      </div>

      <section className="card">
        <h2 className="mb-4 font-semibold">Añadir al horario</h2>
        {classes.length === 0 ? (
          <p className="text-sm text-slate-600">
            Primero crea alguna clase en <Link className="text-emerald-700 underline" href="/admin/clases">Clases</Link>.
          </p>
        ) : (
          <ActionForm action={addSlots} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="label" htmlFor="class_type_id">Clase</label>
                <select className="input" id="class_type_id" name="class_type_id" required>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="start_time">Hora de inicio</label>
                <input className="input" id="start_time" name="start_time" type="time" required />
              </div>
              <div>
                <label className="label" htmlFor="valid_from">Empieza el</label>
                <input className="input" id="valid_from" name="valid_from" type="date" required defaultValue={todayISO()} />
              </div>
            </div>
            <div>
              <span className="label">Días de la semana</span>
              <div className="flex flex-wrap gap-3">
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
          const daySlots = slots.filter((slot) => slot.weekday === index + 1);
          return (
            <div key={day} className="card p-3">
              <h3 className="mb-2 font-semibold">{day}</h3>
              {daySlots.length === 0 && <p className="text-xs text-slate-500">Sin clases</p>}
              <ul className="space-y-2">
                {daySlots.map((slot) => (
                  <li key={slot.id} className="rounded-md bg-slate-50 p-2 text-sm">
                    <div className="font-medium">{formatTime(slot.start_time)} · {slot.name}</div>
                    <div className="text-xs text-slate-600">
                      {slot.duration_min} min · {slot.capacity} plazas{slot.instructor ? ` · ${slot.instructor}` : ""}
                    </div>
                    {slot.valid_from > todayISO() && (
                      <div className="text-xs text-amber-700">Empieza el {slot.valid_from}</div>
                    )}
                    {slot.valid_to && <div className="text-xs text-amber-700">Hasta el {slot.valid_to}</div>}
                    <form action={removeSlot} className="mt-1">
                      <input type="hidden" name="id" value={slot.id} />
                      <ConfirmButton
                        className="text-xs text-red-700 hover:underline"
                        message="¿Quitar esta clase del horario? Las sesiones futuras sin reservas se borrarán; las que tengan reservas se mantienen."
                      >
                        Quitar
                      </ConfirmButton>
                    </form>
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
