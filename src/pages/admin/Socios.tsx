import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ActionButton, ActionForm, ErrorBox, Loading } from "../../components/ActionForm";
import { useAuth } from "../../lib/auth";
import { downloadCsv } from "../../lib/csv";
import { addDays, formatDate, formatTime, todayISO } from "../../lib/dates";
import { must, rpc, siteUrl, supabase, textField } from "../../lib/supabase";
import type { Profile, Role } from "../../lib/types";
import { useData } from "../../lib/useData";

type Invitation = { email: string; name: string; phone: string | null; role: Role; created_at: string };

const roleLabel = (role: Role) => (role === "admin" ? "Administrador" : "Socio");

export function Socios() {
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const { data, error, reload } = useData(async () => {
    const [profiles, invitations, upcoming] = await Promise.all([
      must(supabase.from("profiles").select().order("role").order("name")),
      must(supabase.from("invitations").select().order("created_at", { ascending: false })),
      must(supabase.from("bookings").select("user_id, sessions!inner(day, cancelled)").eq("status", "booked")
        .gte("sessions.day", todayISO()).eq("sessions.cancelled", false)),
    ]);
    const counts = new Map<string, number>();
    for (const b of upcoming as { user_id: string }[]) counts.set(b.user_id, (counts.get(b.user_id) ?? 0) + 1);
    return { profiles: profiles as Profile[], invitations: invitations as Invitation[], counts };
  });

  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  const q = search.trim().toLowerCase();
  const profiles = data.profiles.filter(
    (p) => (showInactive || p.active) &&
      (!q || [p.name, p.email, p.phone ?? ""].some((v) => v.toLowerCase().includes(q))),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="page-title">Socios</h1>
          <p className="page-lead">{data.profiles.length} cuenta(s), {data.invitations.length} pendiente(s) de crear cuenta</p>
        </div>
        <button
          className="btn-secondary"
          type="button"
          onClick={() => downloadCsv("socios.csv", [
            ["Nombre", "Email", "Teléfono", "Perfil", "Activo"],
            ...data.profiles.map((p) => [p.name, p.email, p.phone, roleLabel(p.role), p.active ? "Sí" : "No"]),
          ])}
        >
          Descargar listado (Excel)
        </button>
      </div>

      <section className="card">
        <h2 className="section-title mb-1">Dar de alta</h2>
        <p className="mb-4 text-sm text-muted">
          Después, la persona crea su cuenta con ese mismo email en <span className="font-medium">{siteUrl("/registro")}</span> y
          elige su propia contraseña. Nadie más la conoce.
        </p>
        <ActionForm
          resetOnSuccess
          onDone={reload}
          className="grid gap-4 md:grid-cols-5 md:items-end"
          action={async (form) => {
            const name = textField(form, "name");
            const email = textField(form, "email")?.toLowerCase();
            if (!name || !email) throw new Error("Escribe el nombre y el email.");
            if (data.profiles.some((p) => p.email === email)) throw new Error("Ya existe una cuenta con ese email.");
            await must(supabase.from("invitations").upsert({ name, email, phone: textField(form, "phone"), role: form.get("role") }));
            return `${name} está dado de alta. Dile que cree su cuenta en ${siteUrl("/registro")} con el email ${email}.`;
          }}
        >
          <div>
            <label className="label" htmlFor="name">Nombre y apellidos</label>
            <input className="input" id="name" name="name" required />
          </div>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input className="input" id="email" name="email" type="email" required />
          </div>
          <div>
            <label className="label" htmlFor="phone">Teléfono</label>
            <input className="input" id="phone" name="phone" type="tel" />
          </div>
          <div>
            <label className="label" htmlFor="role">Perfil</label>
            <select className="input" id="role" name="role" defaultValue="member">
              <option value="member">Socio</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          <button className="btn" type="submit">Dar de alta</button>
        </ActionForm>
      </section>

      {data.invitations.length > 0 && (
        <section className="card overflow-x-auto">
          <h2 className="section-title mb-3">Pendientes de crear su cuenta</h2>
          <table className="table">
            <thead><tr><th>Nombre</th><th>Email</th><th>Perfil</th><th></th></tr></thead>
            <tbody>
              {data.invitations.map((i) => (
                <tr key={i.email}>
                  <td className="font-medium">{i.name}</td>
                  <td>{i.email}</td>
                  <td>{roleLabel(i.role)}</td>
                  <td className="text-right">
                    <ActionButton
                      className="btn-danger"
                      confirm={`¿Anular el alta de ${i.name}?`}
                      action={() => must(supabase.from("invitations").delete().eq("email", i.email)).then(() => undefined)}
                      onDone={reload}
                    >
                      Anular
                    </ActionButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="card">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <input className="input max-w-xs" placeholder="Buscar por nombre, email o teléfono" value={search} onChange={(e) => setSearch(e.target.value)} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} /> Incluir desactivados
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead><tr><th>Nombre</th><th>Email</th><th>Teléfono</th><th>Perfil</th><th>Próximas reservas</th><th></th></tr></thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id} className={p.active ? "" : "text-faint"}>
                  <td className="font-medium">{p.name}{!p.active && " (desactivado)"}</td>
                  <td>{p.email}</td>
                  <td>{p.phone}</td>
                  <td>{roleLabel(p.role)}</td>
                  <td>{data.counts.get(p.id) ?? 0}</td>
                  <td className="text-right"><Link className="btn-secondary" to={`/admin/socios/${p.id}`}>Ver</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

const STATUS_LABELS = { booked: "Apuntado", waitlist: "En espera", cancelled: "Desapuntado" };

export function SocioDetalle() {
  const id = useParams().id!;
  const { profile: me } = useAuth();
  const navigate = useNavigate();
  const { data, error, reload } = useData(async () => {
    const [member, bookings] = await Promise.all([
      must(supabase.from("profiles").select().eq("id", id).single()),
      must(supabase.from("bookings")
        .select("id, session_id, status, sessions!inner(day, start_time, cancelled, class_types(name))")
        .eq("user_id", id).gte("sessions.day", addDays(todayISO(), -30))),
    ]);
    type Row = { id: number; session_id: number; status: keyof typeof STATUS_LABELS;
      sessions: { day: string; start_time: string; cancelled: boolean; class_types: { name: string } } };
    const rows = (bookings as unknown as Row[]).sort((a, b) =>
      (b.sessions.day + b.sessions.start_time).localeCompare(a.sessions.day + a.sessions.start_time));
    return { member: member as Profile, bookings: rows };
  }, [id]);

  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  const { member } = data;
  const isSelf = me?.id === member.id;

  return (
    <div className="space-y-6">
      <Link className="back-link" to="/admin/socios">← Socios</Link>
      <div>
        <h1 className="page-title">{member.name}</h1>
        <p className="page-lead">{member.email}</p>
      </div>

      <section className="card">
        <ActionForm
          onDone={reload}
          className="grid gap-4 md:grid-cols-3"
          action={async (form) => {
            const name = textField(form, "name");
            if (!name) throw new Error("Escribe el nombre.");
            await must(supabase.from("profiles").update({
              name, phone: textField(form, "phone"), role: form.get("role"), active: isSelf || form.get("active") === "on",
            }).eq("id", id));
            return "Cambios guardados.";
          }}
        >
          <div>
            <label className="label" htmlFor="name">Nombre y apellidos</label>
            <input className="input" id="name" name="name" required defaultValue={member.name} />
          </div>
          <div>
            <label className="label" htmlFor="phone">Teléfono</label>
            <input className="input" id="phone" name="phone" type="tel" defaultValue={member.phone ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="role">Perfil</label>
            <select className="input" id="role" name="role" defaultValue={member.role} disabled={isSelf}>
              <option value="member">Socio</option>
              <option value="admin">Administrador</option>
            </select>
            {isSelf && <input type="hidden" name="role" value="admin" />}
          </div>
          <label className="flex items-center gap-2 text-sm md:col-span-3">
            <input type="checkbox" name="active" defaultChecked={member.active} disabled={isSelf} />
            Cuenta activa (si la desactivas, no podrá entrar ni reservar)
          </label>
          <div className="md:col-span-3"><button className="btn" type="submit">Guardar cambios</button></div>
        </ActionForm>
      </section>

      <section className="card">
        <h2 className="section-title mb-1">Contraseña</h2>
        <p className="mb-3 text-sm text-muted">
          Las contraseñas están cifradas y nadie puede verlas. Puedes enviarle un email para que elija una nueva.
        </p>
        <ActionForm
          action={async () => {
            await must(supabase.auth.resetPasswordForEmail(member.email, { redirectTo: siteUrl("/nueva-contrasena") }));
            return `Email enviado a ${member.email}.`;
          }}
        >
          <button className="btn-secondary" type="submit">Enviar email para cambiar la contraseña</button>
        </ActionForm>
      </section>

      <section className="card overflow-x-auto">
        <h2 className="section-title mb-3">Reservas (últimos 30 días y futuras)</h2>
        {data.bookings.length === 0 ? <p className="text-sm text-muted">Sin reservas.</p> : (
          <table className="table">
            <thead><tr><th>Fecha</th><th>Hora</th><th>Clase</th><th>Estado</th></tr></thead>
            <tbody>
              {data.bookings.map((b) => (
                <tr key={b.id}>
                  <td>{formatDate(b.sessions.day)}</td>
                  <td>{formatTime(b.sessions.start_time)}</td>
                  <td><Link className="link" to={`/admin/sesiones/${b.session_id}`}>{b.sessions.class_types.name}</Link></td>
                  <td>{b.sessions.cancelled ? "Sesión cancelada" : STATUS_LABELS[b.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {!isSelf && (
        <section className="card">
          <h2 className="section-title mb-1">Borrar cuenta</h2>
          <p className="mb-3 text-sm text-muted">
            Borra la cuenta y todas sus reservas de forma definitiva (por ejemplo, si el socio pide que se borren sus
            datos). Si solo deja el gimnasio, mejor desactívala.
          </p>
          <ActionButton
            className="btn-danger"
            confirm={`¿Borrar definitivamente la cuenta de ${member.name} y todas sus reservas?`}
            action={() => rpc("admin_delete_member", { p_user_id: id }).then(() => undefined)}
            onDone={() => navigate("/admin/socios")}
          >
            Borrar cuenta
          </ActionButton>
        </section>
      )}
    </div>
  );
}
