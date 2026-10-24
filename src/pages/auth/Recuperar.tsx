import { Link } from "react-router";
import { ActionForm } from "../../components/ActionForm";
import { must, siteUrl, supabase } from "../../lib/supabase";
import { AuthCard } from "./AuthCard";

export function Recuperar() {
  return (
    <AuthCard title="Recuperar contraseña">
      <p className="mb-4 text-sm text-muted">Te enviaremos un enlace para elegir una contraseña nueva.</p>
      <ActionForm
        className="grid gap-4"
        action={async (data) => {
          await must(
            supabase.auth.resetPasswordForEmail(String(data.get("email")).trim(), {
              redirectTo: siteUrl("/nueva-contrasena"),
            }),
          );
          return "Si el email está registrado, te llegará un enlace en unos minutos. Mira también en spam.";
        }}
      >
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input className="input" id="email" name="email" type="email" autoComplete="username" required />
        </div>
        <button className="btn mt-2 w-full" type="submit">Enviar enlace</button>
      </ActionForm>
      <p className="mt-4 text-center text-sm"><Link className="link" to="/login">Volver a entrar</Link></p>
    </AuthCard>
  );
}
