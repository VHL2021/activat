"use server";

import { redirect } from "next/navigation";
import type { ActionState } from "@/components/action-form";
import { login, logout } from "@/lib/auth";
import { requestPasswordReset, resetPasswordWithToken } from "@/lib/password-reset";

export async function loginAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Escribe tu email y tu contraseña." };
  const result = await login(email, password);
  if ("error" in result) return { error: result.error };
  redirect(result.role === "admin" ? "/admin" : "/socio");
}

export async function logoutAction() {
  await logout();
  redirect("/login");
}

export async function requestResetAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "");
  if (!email) return { error: "Escribe tu email." };
  await requestPasswordReset(email);
  return { ok: "Si el email está registrado, te llegará un enlace en unos minutos. Mira también en spam." };
}

export async function resetPasswordAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };
  if (password !== formData.get("repeat")) return { error: "Las dos contraseñas no coinciden." };
  if (!(await resetPasswordWithToken(token, password))) {
    return { error: "El enlace ha caducado o ya se ha usado. Pide uno nuevo." };
  }
  redirect("/login?nueva=1");
}
