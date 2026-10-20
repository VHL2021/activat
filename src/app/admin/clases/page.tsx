import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { createClass } from "./actions";
import { ClassFields, type ClassType } from "./class-fields";

export default async function ClasesPage() {
  await requireAdmin();
  const [classes, settings] = await Promise.all([
    query<ClassType & { slots: number }>(
      `SELECT c.*, (SELECT count(*)::int FROM schedule_slots s
         WHERE s.class_type_id = c.id AND (s.valid_to IS NULL OR s.valid_to >= CURRENT_DATE)) AS slots
       FROM class_types c ORDER BY c.active DESC, c.name`,
    ),
    getSettings(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Clases</h1>
        <p className="text-sm text-slate-600">Define cada tipo de clase con su aforo. Después la colocas en el horario semanal.</p>
      </div>

      <section className="card">
        <h2 className="mb-4 font-semibold">Nueva clase</h2>
        <ActionForm action={createClass} resetOnSuccess className="grid gap-4 md:grid-cols-3">
          <ClassFields defaultCapacity={settings.defaultCapacity} />
          <div className="md:col-span-3">
            <button className="btn" type="submit">Crear clase</button>
          </div>
        </ActionForm>
      </section>

      <section className="card overflow-x-auto">
        {classes.length === 0 ? (
          <p className="text-sm text-slate-600">Todavía no hay clases.</p>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Clase</th><th>Monitor</th><th>Duración</th><th>Aforo</th><th>En horario</th><th>Estado</th><th></th></tr>
            </thead>
            <tbody>
              {classes.map((c) => (
                <tr key={c.id} className={c.active ? "" : "text-slate-400"}>
                  <td className="font-medium">{c.name}</td>
                  <td>{c.instructor}</td>
                  <td>{c.duration_min} min</td>
                  <td>{c.capacity}</td>
                  <td>{c.slots} a la semana</td>
                  <td>{c.active ? "Activa" : "Desactivada"}</td>
                  <td className="text-right">
                    <Link className="btn-secondary" href={`/admin/clases/${c.id}`}>Editar</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
