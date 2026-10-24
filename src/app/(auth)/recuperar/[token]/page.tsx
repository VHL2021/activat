import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { isValidResetToken } from "@/lib/password-reset";
import { resetPasswordAction } from "../../actions";

export const metadata = { title: "Nueva contraseña · Reservas del gimnasio" };

export default async function NuevaContrasenaPage({ params }: PageProps<"/recuperar/[token]">) {
  const { token } = await params;
  const valid = await isValidResetToken(token);

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="card w-full max-w-sm p-6">
        <h1 className="mb-6 text-xl font-semibold">Nueva contraseña</h1>
        {valid ? (
          <ActionForm action={resetPasswordAction} className="space-y-4">
            <input type="hidden" name="token" value={token} />
            <div>
              <label className="label" htmlFor="password">Nueva contraseña (mínimo 8 caracteres)</label>
              <input className="input" id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
            </div>
            <div>
              <label className="label" htmlFor="repeat">Repítela</label>
              <input className="input" id="repeat" name="repeat" type="password" autoComplete="new-password" required />
            </div>
            <button className="btn w-full" type="submit">Guardar contraseña</button>
          </ActionForm>
        ) : (
          <p className="text-sm text-slate-600">
            Este enlace ha caducado o ya se ha usado.{" "}
            <Link className="text-emerald-700 underline" href="/recuperar">Pide uno nuevo</Link>.
          </p>
        )}
      </div>
    </main>
  );
}
