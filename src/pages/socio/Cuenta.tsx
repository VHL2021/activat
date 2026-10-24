import { ActionForm } from "../../components/ActionForm";
import { useAuth } from "../../lib/auth";
import { downloadFile } from "../../lib/csv";
import { must, rpc, supabase } from "../../lib/supabase";

export function Cuenta() {
  const { profile, session, refreshProfile } = useAuth();
  if (!profile || !session) return null;

  return (
    <div className="space-y-6">
      <h1 className="page-title">Mi cuenta</h1>

      <section className="card">
        <h2 className="section-title">Mis datos</h2>
        <p className="mt-3 text-lg font-semibold">{profile.name}</p>
        <p className="mb-4 text-sm text-muted">{profile.email}</p>
        <ActionForm
          onDone={refreshProfile}
          className="flex flex-wrap items-end gap-3"
          action={async (form) => {
            await rpc("update_my_phone", { p_phone: String(form.get("phone") ?? "") });
            return "Datos guardados.";
          }}
        >
          <div>
            <label className="label" htmlFor="phone">Teléfono</label>
            <input className="input" id="phone" name="phone" type="tel" defaultValue={profile.phone ?? ""} />
          </div>
          <button className="btn-secondary" type="submit">Guardar</button>
        </ActionForm>
        <p className="mt-3 text-xs text-muted">Para cambiar tu nombre o email, pídeselo al gimnasio.</p>
      </section>

      <section className="card">
        <h2 className="section-title mb-3">Cambiar contraseña</h2>
        <ActionForm
          resetOnSuccess
          className="grid gap-4 sm:max-w-sm"
          action={async (form) => {
            const password = String(form.get("password"));
            if (password !== form.get("repeat")) throw new Error("Las dos contraseñas nuevas no coinciden.");
            // Se comprueba la contraseña actual antes de cambiarla.
            await must(supabase.auth.signInWithPassword({ email: profile.email, password: String(form.get("current")) }))
              .catch(() => { throw new Error("La contraseña actual no es correcta."); });
            await must(supabase.auth.updateUser({ password }));
            return "Contraseña cambiada.";
          }}
        >
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
          <button className="btn justify-self-start" type="submit">Cambiar contraseña</button>
        </ActionForm>
      </section>

      <section className="card">
        <h2 className="section-title mb-1">Privacidad</h2>
        <p className="mb-3 text-sm text-muted">
          Puedes descargar todos los datos que el gimnasio guarda sobre ti. Si quieres que se borren, pídeselo al gimnasio.
        </p>
        <button
          className="btn-secondary"
          type="button"
          onClick={async () => downloadFile("mis-datos.json", JSON.stringify(await rpc("my_data"), null, 2), "application/json")}
        >
          Descargar mis datos
        </button>
      </section>
    </div>
  );
}
