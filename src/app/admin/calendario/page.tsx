import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { ConfirmButton } from "@/components/confirm-button";
import { requireAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { addClosedDays, deleteClosedDay, listClosedDays } from "./actions";

const KIND_LABELS: Record<string, string> = { festivo: "Festivo", vacaciones: "Vacaciones", otro: "Otro" };

export default async function CalendarioPage({ searchParams }: PageProps<"/admin/calendario">) {
  await requireAdmin();
  const includePast = (await searchParams).pasados === "1";
  const days = await listClosedDays(includePast);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Calendario</h1>
        <p className="text-sm text-slate-600">
          Los días cerrados no tienen clases. Si ya había sesiones ese día, se cancelan automáticamente.
        </p>
      </div>

      <section className="card">
        <h2 className="mb-4 font-semibold">Marcar días cerrados</h2>
        <ActionForm action={addClosedDays} resetOnSuccess className="grid gap-4 md:grid-cols-5 md:items-end">
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
          <h2 className="font-semibold">{includePast ? "Todos los días cerrados" : "Próximos días cerrados"}</h2>
          <Link className="text-sm text-emerald-700 hover:underline" href={includePast ? "?" : "?pasados=1"}>
            {includePast ? "Ver solo los próximos" : "Ver también los pasados"}
          </Link>
        </div>
        {days.length === 0 ? (
          <p className="text-sm text-slate-600">No hay días cerrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr><th>Fecha</th><th>Tipo</th><th>Motivo</th><th></th></tr>
              </thead>
              <tbody>
                {days.map((day) => (
                  <tr key={day.id}>
                    <td>{formatDate(day.day, { year: "numeric" })}</td>
                    <td>{KIND_LABELS[day.kind]}</td>
                    <td>{day.reason}</td>
                    <td className="text-right">
                      <form action={deleteClosedDay}>
                        <input type="hidden" name="id" value={day.id} />
                        <ConfirmButton message="¿Quitar este día cerrado? Las sesiones de ese día se reabrirán.">
                          Quitar
                        </ConfirmButton>
                      </form>
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
