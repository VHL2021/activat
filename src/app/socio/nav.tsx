"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/socio", label: "Horario" },
  { href: "/socio/mis-clases", label: "Mis clases" },
  { href: "/socio/cuenta", label: "Mi cuenta" },
];

export function SocioNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1">
      {LINKS.map((link) => {
        const active = link.href === "/socio" ? pathname === "/socio" : pathname.startsWith(link.href);
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
