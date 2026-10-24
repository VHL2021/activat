import { Link, useNavigate } from "react-router";
import { ActionForm } from "../../components/ActionForm";
import { useAuth } from "../../lib/auth";
import { must, supabase } from "../../lib/supabase";
import { AuthCard } from "./AuthCard";

export function NuevaContrasena() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) return <AuthCard title="Nueva contraseña"><p className="text-sm text-slate-500">Cargando…</p></AuthCard>;
  if (!session) {
    return (
      <AuthCard title="Nueva contraseña">
        <p className="text-sm text-slate-600">
          Este enlace ha caducado o ya se ha usado. <Link className="link" to="/recuperar">Pide uno nuevo</Link>.
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Nueva contraseña">
      <ActionForm
        className="space-y-4"
        action={async (data) => {
          const password = String(data.get("password"));
          if (password !== data.get("repeat")) throw new Error("Las dos contraseñas no coinciden.");
          await must(supabase.auth.updateUser({ password }));
          await supabase.auth.signOut();
          navigate("/login?nueva=1");
        }}
      >
        <div>
          <label className="label" htmlFor="password">Nueva contraseña (mínimo 8 caracteres)</label>
          <input className="input" id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        </div>
        <div>
          <label className="label" htmlFor="repeat">Repítela</label>
          <input className="input" id="repeat" name="repeat" type="password" autoComplete="new-password" required />
        </div>
        <button className="btn w-full" type="submit">Guardar contraseña</button>
      </ActionForm>
    </AuthCard>
  );
}
