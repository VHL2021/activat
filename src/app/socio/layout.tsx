import Link from "next/link";
import { logoutAction } from "@/app/(auth)/actions";
import { requireUser } from "@/lib/auth";
import { SocioNav } from "./nav";

export default async function SocioLayout({ children }: LayoutProps<"/socio">) {
  const user = await requireUser();
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-between gap-4">
            <span className="font-semibold">Hola, {user.name.split(" ")[0]}</span>
            <div className="flex items-center gap-2">
              {user.role === "admin" && (
                <Link className="text-sm text-emerald-700 hover:underline" href="/admin">Administración</Link>
              )}
              <form action={logoutAction}>
                <button className="btn-secondary" type="submit">Salir</button>
              </form>
            </div>
          </div>
          <SocioNav />
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
