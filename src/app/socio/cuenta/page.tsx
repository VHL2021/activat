import { ActionForm } from "@/components/action-form";
import { requireUser } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { changePasswordAction, updatePhoneAction } from "../actions";

export default async function CuentaPage() {
  const user = await requireUser();
  const details = await queryOne<{ phone: string | null }>("SELECT phone FROM users WHERE id = $1", [user.id]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Mi cuenta</h1>

      <section className="card">
        <h2 className="mb-3 font-semibold">Mis datos</h2>
        <p className="mb-3 text-sm text-slate-600">{user.name} · {user.email}</p>
        <ActionForm action={updatePhoneAction} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label" htmlFor="phone">Teléfono</label>
            <input className="input" id="phone" name="phone" type="tel" defaultValue={details?.phone ?? ""} />
          </div>
          <button className="btn-secondary" type="submit">Guardar</button>
        </ActionForm>
        <p className="mt-3 text-xs text-slate-500">Para cambiar tu nombre o email, pídeselo al gimnasio.</p>
      </section>

      <section className="card">
        <h2 className="mb-3 font-semibold">Cambiar contraseña</h2>
        <ActionForm action={changePasswordAction} resetOnSuccess className="grid gap-4 sm:max-w-sm">
          <div>
            <label className="label" htmlFor="current">Contraseña actual</label>
            <input className="input" id="current" name="current" type="password" autoComplete="current-password" required />
          </div>
          <div>
            <label className="label" htmlFor="password">Nueva contraseña (mínimo 8 caracteres)</label>
            <input className="input" id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
          </div>
          <div>
            <label className="label" htmlFor="repeat">Repite la nueva contraseña</label>
            <input className="input" id="repeat" name="repeat" type="password" autoComplete="new-password" required />
          </div>
          <button className="btn" type="submit">Cambiar contraseña</button>
        </ActionForm>
      </section>

      <section className="card">
        <h2 className="mb-1 font-semibold">Privacidad</h2>
        <p className="mb-3 text-sm text-slate-600">
          Puedes descargar todos los datos que el gimnasio guarda sobre ti. Si quieres que se borren, pídeselo al gimnasio.
        </p>
        <a className="btn-secondary" href="/socio/cuenta/datos" download>Descargar mis datos</a>
      </section>
    </div>
  );
}
