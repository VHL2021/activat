import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { ConfirmButton } from "@/components/confirm-button";
import { requireAdmin } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { formatDate, formatTime } from "@/lib/dates";
import { deleteMember, resetPassword, updateMember } from "../actions";
import { MemberFields, type Member } from "../member-fields";

const STATUS_LABELS = { booked: "Apuntado", waitlist: "En espera", cancelled: "Desapuntado" };

export default async function MemberPage({ params }: PageProps<"/admin/socios/[id]">) {
  const admin = await requireAdmin();
  const id = Number((await params).id) || 0;
  const member = await queryOne<Member>("SELECT id, name, email, phone, role, active FROM users WHERE id = $1", [id]);
  if (!member) notFound();
  const bookings = await query<{
    id: number;
    session_id: number;
    status: keyof typeof STATUS_LABELS;
    day: string;
    start_time: string;
    class_name: string;
    cancelled: boolean;
  }>(
    `SELECT b.id, b.session_id, b.status, s.day, s.start_time, c.name AS class_name, s.cancelled
     FROM bookings b JOIN sessions s ON s.id = b.session_id JOIN class_types c ON c.id = s.class_type_id
     WHERE b.user_id = $1 AND s.day >= CURRENT_DATE - 30
     ORDER BY s.day DESC, s.start_time DESC`,
    [id],
  );
  const isSelf = admin.id === member.id;

  return (
    <div className="space-y-6">
      <Link className="text-sm text-emerald-700 hover:underline" href="/admin/socios">← Volver a socios</Link>
      <h1 className="text-2xl font-semibold">{member.name}</h1>

      <section className="card">
        <ActionForm action={updateMember} className="grid gap-4 md:grid-cols-4">
          <input type="hidden" name="id" value={member.id} />
          <MemberFields value={member} />
          <label className="flex items-center gap-2 text-sm md:col-span-4">
            <input type="checkbox" name="active" defaultChecked={member.active} disabled={isSelf} />
            Cuenta activa (si la desactivas, no podrá entrar ni reservar)
            {isSelf && <input type="hidden" name="active" value="on" />}
          </label>
          <div className="md:col-span-4">
            <button className="btn" type="submit">Guardar cambios</button>
          </div>
        </ActionForm>
      </section>

      <section className="card">
        <h2 className="mb-1 font-semibold">Contraseña</h2>
        <p className="mb-3 text-sm text-slate-600">
          Las contraseñas se guardan cifradas y nadie puede verlas. Puedes generar una nueva temporal.
        </p>
        <ActionForm action={resetPassword}>
          <input type="hidden" name="id" value={member.id} />
          <button className="btn-secondary" type="submit">Generar nueva contraseña</button>
        </ActionForm>
      </section>

      <section className="card overflow-x-auto">
        <h2 className="mb-3 font-semibold">Reservas (últimos 30 días y futuras)</h2>
        {bookings.length === 0 ? (
          <p className="text-sm text-slate-600">Sin reservas.</p>
        ) : (
          <table className="table">
            <thead><tr><th>Fecha</th><th>Hora</th><th>Clase</th><th>Estado</th></tr></thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td>{formatDate(b.day)}</td>
                  <td>{formatTime(b.start_time)}</td>
                  <td>
                    <Link className="text-emerald-700 hover:underline" href={`/admin/sesiones/${b.session_id}`}>{b.class_name}</Link>
                  </td>
                  <td>{b.cancelled ? "Sesión cancelada" : STATUS_LABELS[b.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {!isSelf && (
        <section className="card">
          <h2 className="mb-1 font-semibold">Borrar cuenta</h2>
          <p className="mb-3 text-sm text-slate-600">
            Borra la cuenta y todas sus reservas de forma definitiva (por ejemplo, si el socio pide que se borren sus datos).
            Si solo deja el gimnasio, mejor desactívala.
          </p>
          <form action={deleteMember}>
            <input type="hidden" name="id" value={member.id} />
            <ConfirmButton message={`¿Borrar definitivamente la cuenta de ${member.name} y todas sus reservas?`}>
              Borrar cuenta
            </ConfirmButton>
          </form>
        </section>
      )}
    </div>
  );
}
