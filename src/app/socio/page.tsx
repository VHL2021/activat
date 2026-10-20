import { logoutAction } from "@/app/(auth)/actions";
import { requireUser } from "@/lib/auth";

export default async function SocioPage() {
  const user = await requireUser();
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="card space-y-4">
        <h1 className="text-xl font-semibold">Hola, {user.name}</h1>
        <p className="text-slate-600">La zona de socios (horarios y reservas) estará disponible pronto.</p>
        <form action={logoutAction}>
          <button className="btn-secondary" type="submit">Salir</button>
        </form>
      </div>
    </main>
  );
}
