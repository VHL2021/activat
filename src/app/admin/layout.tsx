import { logoutAction } from "@/app/(auth)/actions";
import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "./nav";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireAdmin();
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center justify-between gap-4">
            <span className="font-semibold">Gimnasio · Administración</span>
            <form action={logoutAction} className="md:hidden">
              <button className="btn-secondary" type="submit">Salir</button>
            </form>
          </div>
          <AdminNav />
          <div className="hidden items-center gap-3 md:flex">
            <span className="text-sm text-slate-600">{user.name}</span>
            <form action={logoutAction}>
              <button className="btn-secondary" type="submit">Salir</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
