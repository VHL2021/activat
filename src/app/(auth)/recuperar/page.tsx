import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { requestResetAction } from "../actions";

export const metadata = { title: "Recuperar contraseña · Reservas del gimnasio" };

export default function RecuperarPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="card w-full max-w-sm p-6">
        <h1 className="mb-2 text-xl font-semibold">Recuperar contraseña</h1>
        <p className="mb-6 text-sm text-slate-600">Te enviaremos un enlace para elegir una contraseña nueva.</p>
        <ActionForm action={requestResetAction} className="space-y-4">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input className="input" id="email" name="email" type="email" autoComplete="username" required />
          </div>
          <button className="btn w-full" type="submit">Enviar enlace</button>
        </ActionForm>
        <p className="mt-4 text-center text-sm">
          <Link className="text-emerald-700 hover:underline" href="/login">Volver a entrar</Link>
        </p>
      </div>
    </main>
  );
}
