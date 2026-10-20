"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Inicio" },
  { href: "/admin/sesiones", label: "Sesiones" },
  { href: "/admin/horario", label: "Horario" },
  { href: "/admin/clases", label: "Clases" },
  { href: "/admin/calendario", label: "Calendario" },
  { href: "/admin/socios", label: "Socios" },
  { href: "/admin/ajustes", label: "Ajustes" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-1">
      {LINKS.map((link) => {
        const active = link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              active ? "bg-emerald-700 text-white" : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
