import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { createMember } from "./actions";
import { MemberFields, type Member } from "./member-fields";

export default async function SociosPage({ searchParams }: PageProps<"/admin/socios">) {
  await requireAdmin();
  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q.trim() : "";
  const showInactive = params.inactivos === "1";
  const members = await query<Member & { upcoming: number }>(
    `SELECT u.id, u.name, u.email, u.phone, u.role, u.active,
       (SELECT count(*)::int FROM bookings b JOIN sessions s ON s.id = b.session_id
         WHERE b.user_id = u.id AND b.status = 'booked' AND s.day >= CURRENT_DATE AND NOT s.cancelled) AS upcoming
     FROM users u
     WHERE ($1 = '' OR u.name ILIKE '%' || $1 || '%' OR u.email ILIKE '%' || $1 || '%' OR u.phone ILIKE '%' || $1 || '%')
       AND ($2 OR u.active)
     ORDER BY u.role, u.name`,
    [search, showInactive],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Socios</h1>
          <p className="text-sm text-slate-600">{members.length} cuenta(s)</p>
        </div>
        <a className="btn-secondary" href="/admin/socios/csv" download>Descargar listado (Excel)</a>
      </div>

      <section className="card">
        <h2 className="mb-1 font-semibold">Nueva cuenta</h2>
        <p className="mb-4 text-sm text-slate-600">
          Se genera una contraseña temporal para que se la des al socio. Podrá cambiarla al entrar.
        </p>
        <ActionForm action={createMember} resetOnSuccess className="grid gap-4 md:grid-cols-5 md:items-end">
          <MemberFields />
          <button className="btn" type="submit">Crear cuenta</button>
        </ActionForm>
      </section>

      <section className="card">
        <form className="mb-4 flex flex-wrap items-center gap-3">
          <input className="input max-w-xs" name="q" placeholder="Buscar por nombre, email o teléfono" defaultValue={search} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="inactivos" value="1" defaultChecked={showInactive} /> Incluir desactivados
          </label>
          <button className="btn-secondary" type="submit">Buscar</button>
        </form>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr><th>Nombre</th><th>Email</th><th>Teléfono</th><th>Perfil</th><th>Próximas reservas</th><th></th></tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className={m.active ? "" : "text-slate-400"}>
                  <td className="font-medium">{m.name}{!m.active && " (desactivado)"}</td>
                  <td>{m.email}</td>
                  <td>{m.phone}</td>
                  <td>{m.role === "admin" ? "Administrador" : "Socio"}</td>
                  <td>{m.upcoming}</td>
                  <td className="text-right">
                    <Link className="btn-secondary" href={`/admin/socios/${m.id}`}>Ver</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
