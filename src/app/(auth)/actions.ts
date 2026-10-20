"use server";

import { redirect } from "next/navigation";
import type { ActionState } from "@/components/action-form";
import { login, logout } from "@/lib/auth";

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
