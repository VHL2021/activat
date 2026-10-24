import { Link, Navigate, useSearchParams } from "react-router";
import { ActionForm } from "../../components/ActionForm";
import { useAuth } from "../../lib/auth";
import { must, supabase } from "../../lib/supabase";
import { AuthCard } from "./AuthCard";

export function Login() {
  const { session, profile, loading } = useAuth();
  const [params] = useSearchParams();
  if (!loading && session && profile) return <Navigate to={profile.role === "admin" ? "/admin" : "/socio"} replace />;

  return (
    <AuthCard title="Entrar">
      {params.get("nueva") && (
        <p className="notice mb-4">Contraseña cambiada. Ya puedes entrar.</p>
      )}
      <ActionForm
        className="grid gap-4"
        action={async (data) => {
          await must(
            supabase.auth.signInWithPassword({
              email: String(data.get("email")).trim(),
              password: String(data.get("password")),
            }),
          );
        }}
      >
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input className="input" id="email" name="email" type="email" autoComplete="username" required />
        </div>
        <div>
          <label className="label" htmlFor="password">Contraseña</label>
          <input className="input" id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        <button className="btn mt-2 w-full" type="submit">Entrar</button>
      </ActionForm>
      <div className="mt-4 space-y-2 text-center text-sm">
        <p><Link className="link" to="/recuperar">¿Has olvidado tu contraseña?</Link></p>
        <p className="text-muted">¿Primera vez? <Link className="link" to="/registro">Crea tu cuenta</Link></p>
      </div>
    </AuthCard>
  );
}
