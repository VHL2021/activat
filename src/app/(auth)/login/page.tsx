import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { getCurrentUser } from "@/lib/auth";
import { loginAction } from "../actions";

export const metadata = { title: "Entrar · Reservas del gimnasio" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const changed = (await searchParams).nueva === "1";
  const user = await getCurrentUser();
  if (user) redirect(user.role === "admin" ? "/admin" : "/socio");

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="card w-full max-w-sm p-6">
        <h1 className="mb-6 text-xl font-semibold">Reservas del gimnasio</h1>
        {changed && (
          <p className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Contraseña cambiada. Ya puedes entrar.
          </p>
        )}
        <ActionForm action={loginAction} className="space-y-4">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input className="input" id="email" name="email" type="email" autoComplete="username" required />
          </div>
          <div>
            <label className="label" htmlFor="password">Contraseña</label>
            <input className="input" id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          <button className="btn w-full" type="submit">Entrar</button>
        </ActionForm>
        <p className="mt-4 text-center text-sm">
          <Link className="text-emerald-700 hover:underline" href="/recuperar">¿Has olvidado tu contraseña?</Link>
        </p>
      </div>
    </main>
  );
}
