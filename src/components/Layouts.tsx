import { NavLink, Outlet } from "react-router";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";

const ADMIN_LINKS = [
  { to: "/admin", label: "Inicio", end: true },
  { to: "/admin/sesiones", label: "Sesiones" },
  { to: "/admin/horario", label: "Horario" },
  { to: "/admin/clases", label: "Clases" },
  { to: "/admin/calendario", label: "Calendario" },
  { to: "/admin/socios", label: "Socios" },
  { to: "/admin/ajustes", label: "Ajustes" },
];

const SOCIO_LINKS = [
  { to: "/socio", label: "Horario", end: true },
  { to: "/socio/mis-clases", label: "Mis clases" },
  { to: "/socio/cuenta", label: "Mi cuenta" },
];

function Nav({ links }: { links: { to: string; label: string; end?: boolean }[] }) {
  return (
    <nav className="flex flex-wrap gap-1">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          className={({ isActive }) =>
            `rounded-md px-3 py-1.5 text-sm font-medium ${isActive ? "bg-emerald-700 text-white" : "text-slate-700 hover:bg-slate-100"}`
          }
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}

const LogoutButton = () => (
  <button className="btn-secondary" type="button" onClick={() => supabase.auth.signOut()}>Salir</button>
);

export function AdminLayout() {
  const { profile } = useAuth();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center justify-between gap-4">
            <span className="font-semibold">Gimnasio · Administración</span>
            <span className="md:hidden"><LogoutButton /></span>
          </div>
          <Nav links={ADMIN_LINKS} />
          <div className="hidden items-center gap-3 md:flex">
            <NavLink className="text-sm text-slate-600 hover:underline" to="/socio">{profile?.name}</NavLink>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6"><Outlet /></main>
    </div>
  );
}

export function SocioLayout() {
  const { profile } = useAuth();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-between gap-4">
            <span className="font-semibold">Hola, {profile?.name.split(" ")[0]}</span>
            <div className="flex items-center gap-2">
              {profile?.role === "admin" && <NavLink className="link text-sm" to="/admin">Administración</NavLink>}
              <LogoutButton />
            </div>
          </div>
          <Nav links={SOCIO_LINKS} />
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6"><Outlet /></main>
    </div>
  );
}
