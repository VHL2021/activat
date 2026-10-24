import type { Session } from "@supabase/supabase-js";
import { createContext, use, useCallback, useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router";
import { supabase } from "./supabase";
import type { Profile } from "./types";

type Auth = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  recovering: boolean;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovering, setRecovering] = useState(false);

  const loadProfile = useCallback(async (s: Session | null) => {
    if (s) {
      const { data } = await supabase.from("profiles").select("*").eq("id", s.user.id).maybeSingle();
      setProfile(data?.active ? data : null);
    } else {
      setProfile(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "PASSWORD_RECOVERY") setRecovering(true);
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") setLoading(true);
      setSession(s);
      // Fuera del callback: Supabase no permite llamadas dentro de él.
      setTimeout(() => loadProfile(s), 0);
    });
    return () => data.subscription.unsubscribe();
  }, [loadProfile]);

  const refreshProfile = useCallback(() => loadProfile(session), [loadProfile, session]);

  return (
    <AuthContext value={{ session, profile, loading, recovering, refreshProfile }}>{children}</AuthContext>
  );
}

export function useAuth() {
  const auth = use(AuthContext);
  if (!auth) throw new Error("useAuth fuera de AuthProvider");
  return auth;
}

// Muestra la página solo a quien tenga sesión (y, si se pide, perfil de administrador).
export function RequireUser({ admin, children }: { admin?: boolean; children: ReactNode }) {
  const { session, profile, loading } = useAuth();
  if (loading) return <p className="p-8 text-center text-slate-500">Cargando…</p>;
  if (!session) return <Navigate to="/login" replace />;
  if (!profile) {
    return (
      <div className="mx-auto max-w-sm p-8 text-center">
        <p className="mb-4 text-slate-700">Tu cuenta está desactivada. Habla con el gimnasio.</p>
        <button className="btn-secondary" onClick={() => supabase.auth.signOut()}>Salir</button>
      </div>
    );
  }
  if (admin && profile.role !== "admin") return <Navigate to="/socio" replace />;
  return children;
}
