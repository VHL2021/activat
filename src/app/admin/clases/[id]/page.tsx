import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { ConfirmButton } from "@/components/confirm-button";
import { requireAdmin } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { deleteClass, updateClass } from "../actions";
import { ClassFields, type ClassType } from "../class-fields";

export default async function EditClassPage({ params }: PageProps<"/admin/clases/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const [c, settings] = await Promise.all([
    queryOne<ClassType>("SELECT * FROM class_types WHERE id = $1", [Number(id) || 0]),
    getSettings(),
  ]);
  if (!c) notFound();

  return (
    <div className="space-y-6">
      <Link className="text-sm text-emerald-700 hover:underline" href="/admin/clases">← Volver a clases</Link>
      <h1 className="text-2xl font-semibold">Editar clase</h1>

      <section className="card">
        <ActionForm action={updateClass} className="grid gap-4 md:grid-cols-3">
          <input type="hidden" name="id" value={c.id} />
          <ClassFields value={c} defaultCapacity={settings.defaultCapacity} />
          <label className="flex items-center gap-2 text-sm md:col-span-3">
            <input type="checkbox" name="active" defaultChecked={c.active} />
            Activa (si la desactivas, no se crean nuevas sesiones de esta clase)
          </label>
          <div className="md:col-span-3">
            <button className="btn" type="submit">Guardar cambios</button>
          </div>
        </ActionForm>
      </section>

      <section className="card">
        <h2 className="mb-2 font-semibold">Borrar clase</h2>
        <p className="mb-3 text-sm text-slate-600">
          Si la clase ya tiene sesiones, se desactiva en lugar de borrarse, para conservar el historial.
        </p>
        <form action={deleteClass}>
          <input type="hidden" name="id" value={c.id} />
          <ConfirmButton message="¿Borrar esta clase?">Borrar clase</ConfirmButton>
        </form>
      </section>
    </div>
  );
}
