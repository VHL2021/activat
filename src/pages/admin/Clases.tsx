import { Link, useNavigate, useParams } from "react-router";
import { ActionButton, ActionForm, ErrorBox, Loading } from "../../components/ActionForm";
import { todayISO } from "../../lib/dates";
import { getSettings, intField, must, rpc, supabase, textField } from "../../lib/supabase";
import type { ClassType } from "../../lib/types";
import { useData } from "../../lib/useData";

function ClassFields({ value, defaultCapacity }: { value?: ClassType; defaultCapacity: number }) {
  return (
    <>
      <div className="md:col-span-2">
        <label className="label" htmlFor="name">Nombre</label>
        <input className="input" id="name" name="name" required defaultValue={value?.name} placeholder="Ej.: Spinning" />
      </div>
      <div>
        <label className="label" htmlFor="instructor">Monitor</label>
        <input className="input" id="instructor" name="instructor" defaultValue={value?.instructor ?? ""} />
      </div>
      <div>
        <label className="label" htmlFor="duration_min">Duración (minutos)</label>
        <input className="input" id="duration_min" name="duration_min" type="number" min={5} step={5} required defaultValue={value?.duration_min ?? 60} />
      </div>
      <div>
        <label className="label" htmlFor="capacity">Aforo máximo (personas)</label>
        <input className="input" id="capacity" name="capacity" type="number" min={1} required defaultValue={value?.capacity ?? defaultCapacity} />
      </div>
      <div className="md:col-span-3">
        <label className="label" htmlFor="description">Descripción</label>
        <input className="input" id="description" name="description" defaultValue={value?.description ?? ""} />
      </div>
    </>
  );
}

const readClass = (data: FormData) => {
  const name = textField(data, "name");
  if (!name) throw new Error("Escribe el nombre de la clase.");
  return {
    name,
    description: textField(data, "description"),
    instructor: textField(data, "instructor"),
    duration_min: intField(data, "duration_min", "Duración", 5),
    capacity: intField(data, "capacity", "Aforo", 1),
  };
};

export function Clases() {
  const { data, error, reload } = useData(async () => {
    const [classes, slots, settings] = await Promise.all([
      must(supabase.from("class_types").select().order("active", { ascending: false }).order("name")),
      must(supabase.from("schedule_slots").select("class_type_id, valid_to")),
      getSettings(),
    ]);
    const today = todayISO();
    const count = (id: number) =>
      (slots as { class_type_id: number; valid_to: string | null }[])
        .filter((s) => s.class_type_id === id && (!s.valid_to || s.valid_to >= today)).length;
    return { classes: (classes as ClassType[]).map((c) => ({ ...c, slots: count(c.id) })), settings };
  });

  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Clases</h1>
        <p className="page-lead">Define cada tipo de clase con su aforo. Después la colocas en el horario semanal.</p>
      </div>

      <section className="card">
        <h2 className="section-title mb-4">Nueva clase</h2>
        <ActionForm
          resetOnSuccess
          onDone={reload}
          className="grid gap-4 md:grid-cols-3"
          action={async (form) => {
            const c = readClass(form);
            await must(supabase.from("class_types").insert(c));
            return `Clase "${c.name}" creada. Ahora puedes añadirla al horario.`;
          }}
        >
          <ClassFields defaultCapacity={data.settings.default_capacity} />
          <div className="md:col-span-3"><button className="btn" type="submit">Crear clase</button></div>
        </ActionForm>
      </section>

      <section className="card overflow-x-auto">
        {data.classes.length === 0 ? (
          <p className="text-sm text-muted">Todavía no hay clases.</p>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Clase</th><th>Monitor</th><th>Duración</th><th>Aforo</th><th>En horario</th><th>Estado</th><th></th></tr>
            </thead>
            <tbody>
              {data.classes.map((c) => (
                <tr key={c.id} className={c.active ? "" : "text-faint"}>
                  <td className="font-medium">{c.name}</td>
                  <td>{c.instructor}</td>
                  <td>{c.duration_min} min</td>
                  <td>{c.capacity}</td>
                  <td>{c.slots} a la semana</td>
                  <td>{c.active ? "Activa" : "Desactivada"}</td>
                  <td className="text-right"><Link className="btn-secondary" to={`/admin/clases/${c.id}`}>Editar</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

export function ClaseEditar() {
  const id = Number(useParams().id);
  const navigate = useNavigate();
  const { data, error } = useData(async () => {
    const [c, settings] = await Promise.all([
      must(supabase.from("class_types").select().eq("id", id).single()),
      getSettings(),
    ]);
    return { c: c as ClassType, settings };
  }, [id]);

  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  const { c } = data;

  return (
    <div className="space-y-6">
      <Link className="back-link" to="/admin/clases">← Clases</Link>
      <h1 className="page-title">Editar clase</h1>
      <section className="card">
        <ActionForm
          className="grid gap-4 md:grid-cols-3"
          action={async (form) => {
            const v = readClass(form);
            await rpc("admin_update_class", {
              p_id: id, p_name: v.name, p_description: v.description ?? "", p_instructor: v.instructor ?? "",
              p_duration: v.duration_min, p_capacity: v.capacity, p_active: form.get("active") === "on",
            });
            return "Cambios guardados. Las sesiones futuras usan ya el nuevo aforo y duración.";
          }}
        >
          <ClassFields value={c} defaultCapacity={data.settings.default_capacity} />
          <label className="flex items-center gap-2 text-sm md:col-span-3">
            <input type="checkbox" name="active" defaultChecked={c.active} />
            Activa (si la desactivas, no se crean nuevas sesiones de esta clase)
          </label>
          <div className="md:col-span-3"><button className="btn" type="submit">Guardar cambios</button></div>
        </ActionForm>
      </section>
      <section className="card">
        <h2 className="section-title mb-2">Borrar clase</h2>
        <p className="mb-3 text-sm text-muted">Si la clase ya tiene sesiones, se desactiva en lugar de borrarse, para conservar el historial.</p>
        <ActionButton
          className="btn-danger"
          confirm="¿Borrar esta clase?"
          action={() => rpc("admin_delete_class", { p_id: id }).then(() => undefined)}
          onDone={() => navigate("/admin/clases")}
        >
          Borrar clase
        </ActionButton>
      </section>
    </div>
  );
}
