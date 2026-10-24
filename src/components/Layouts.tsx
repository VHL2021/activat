import { NavLink, Outlet } from "react-router";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { Logo } from "./Brand";

type Link = { to: string; label: string; end?: boolean };

const ADMIN_LINKS: Link[] = [
  { to: "/admin", label: "Inicio", end: true },
  { to: "/admin/sesiones", label: "Sesiones" },
  { to: "/admin/horario", label: "Horario" },
  { to: "/admin/clases", label: "Clases" },
  { to: "/admin/calendario", label: "Calendario" },
  { to: "/admin/socios", label: "Socios" },
  { to: "/admin/ajustes", label: "Ajustes" },
];

const SOCIO_LINKS: Link[] = [
  { to: "/socio", label: "Horario", end: true },
  { to: "/socio/mis-clases", label: "Mis clases" },
  { to: "/socio/cuenta", label: "Mi cuenta" },
];

const signOut = () => supabase.auth.signOut();

export function AdminLayout() {
  const { profile } = useAuth();
  return (
    <div className="min-h-screen md:grid md:grid-cols-[15rem_1fr]">
      {/* Escritorio: barra lateral. Móvil: cabecera con el menú deslizable. */}
      <aside className="sticky top-0 z-20 bg-ink text-white md:h-screen">
        <div className="flex items-center justify-between px-4 pt-4 pb-3 md:px-6 md:pt-7 md:pb-8">
          <NavLink to="/admin" className="text-3xl"><Logo tone="light" /></NavLink>
          <button className="text-sm font-medium text-white/70 hover:text-white md:hidden" type="button" onClick={signOut}>Salir</button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:px-3 md:pb-0" aria-label="Administración">
          {ADMIN_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `shrink-0 rounded-full px-4 py-2 text-[15px] font-medium transition-colors md:rounded-lg ${
                  isActive ? "bg-brand text-ink" : "text-white/75 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute inset-x-0 bottom-0 hidden border-t border-white/10 px-6 py-5 md:block">
          <p className="truncate text-sm font-medium">{profile?.name}</p>
          <div className="mt-2 flex gap-4 text-sm text-white/70">
            <NavLink className="hover:text-white" to="/socio">Ver como socio</NavLink>
            <button className="hover:text-white" type="button" onClick={signOut}>Salir</button>
          </div>
        </div>
      </aside>
      <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-10 md:py-12"><Outlet /></main>
    </div>
  );
}

export function SocioLayout() {
  const { profile } = useAuth();
  return (
    <div className="min-h-screen pb-24 sm:pb-0">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <NavLink to="/socio" className="text-[28px]"><Logo /></NavLink>
          <nav className="hidden gap-1 sm:flex" aria-label="Zona de socios">
            {SOCIO_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `rounded-full px-4 py-2 text-[15px] font-medium transition-colors ${isActive ? "bg-ink text-white" : "text-muted hover:text-ink"}`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-4 text-sm font-medium">
            {profile?.role === "admin" && <NavLink className="text-muted hover:text-ink" to="/admin">Administración</NavLink>}
            <button className="text-muted hover:text-ink" type="button" onClick={signOut}>Salir</button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 py-7 sm:py-10"><Outlet /></main>

      {/* Móvil: pestañas abajo, al alcance del pulgar. */}
      <nav
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-3 border-t border-line bg-surface/95 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur sm:hidden"
        aria-label="Zona de socios"
      >
        {SOCIO_LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 rounded-xl py-1.5 text-[13px] font-semibold ${isActive ? "text-ink" : "text-faint"}`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`h-1 w-8 rounded-full ${isActive ? "bg-brand" : "bg-transparent"}`} />
                {link.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
