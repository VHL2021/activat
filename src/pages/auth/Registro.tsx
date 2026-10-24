import { useState } from "react";
import { Link } from "react-router";
import { ActionForm } from "../../components/ActionForm";
import { must, siteUrl, supabase } from "../../lib/supabase";
import { AuthCard } from "./AuthCard";

export function Registro() {
  const [sentTo, setSentTo] = useState<string | null>(null);

  if (sentTo) {
    return (
      <AuthCard title="Revisa tu correo">
        <p className="text-sm text-slate-700">
          Te hemos enviado un email a <strong>{sentTo}</strong>. Abre el enlace para confirmar tu cuenta y después entra
          con tu email y tu contraseña.
        </p>
        <p className="mt-4 text-center text-sm"><Link className="link" to="/login">Ir a entrar</Link></p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Crear tu cuenta">
      <p className="mb-4 text-sm text-slate-600">
        Usa el email que diste en el gimnasio. Si no te deja, pide en recepción que te den de alta.
      </p>
      <ActionForm
        className="space-y-4"
        action={async (data) => {
          const email = String(data.get("email")).trim().toLowerCase();
          const password = String(data.get("password"));
          if (password !== data.get("repeat")) throw new Error("Las dos contraseñas no coinciden.");
          const result = await must(
            supabase.auth.signUp({ email, password, options: { emailRedirectTo: siteUrl("/login") } }),
          );
          // Supabase no avisa si el email ya tenía cuenta: lo indica devolviendo un usuario sin identidades.
          if (result.user && result.user.identities?.length === 0) {
            throw new Error("Ya existe una cuenta con ese email. Entra o recupera tu contraseña.");
          }
          setSentTo(email);
        }}
      >
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input className="input" id="email" name="email" type="email" autoComplete="username" required />
        </div>
        <div>
          <label className="label" htmlFor="password">Contraseña (mínimo 8 caracteres)</label>
          <input className="input" id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        </div>
        <div>
          <label className="label" htmlFor="repeat">Repite la contraseña</label>
          <input className="input" id="repeat" name="repeat" type="password" autoComplete="new-password" required />
        </div>
        <p className="text-xs text-slate-500">
          El gimnasio guarda tu nombre, email, teléfono y reservas solo para gestionar las clases. Puedes descargarlos o
          pedir que se borren desde Mi cuenta.
        </p>
        <button className="btn w-full" type="submit">Crear cuenta</button>
      </ActionForm>
      <p className="mt-4 text-center text-sm"><Link className="link" to="/login">Ya tengo cuenta</Link></p>
    </AuthCard>
  );
}
