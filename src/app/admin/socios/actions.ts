"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/components/action-form";
import { hashPassword, requireAdmin } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { firstError, optionalText } from "@/lib/forms";

const memberSchema = z.object({
  name: z.string().trim().min(1, "Escribe el nombre."),
  email: z.email("Escribe un email válido.").trim().toLowerCase(),
  phone: optionalText,
  role: z.enum(["member", "admin"]),
});

// Contraseña temporal fácil de dictar: sin letras o números que se confundan.
function temporaryPassword() {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 10 }, () => alphabet[randomInt(alphabet.length)]).join("");
}

export async function createMember(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = memberSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const m = parsed.data;
  const exists = await queryOne("SELECT 1 FROM users WHERE email = $1", [m.email]);
  if (exists) return { error: "Ya existe una cuenta con ese email." };
  const password = temporaryPassword();
  await query(
    "INSERT INTO users (name, email, phone, role, password_hash) VALUES ($1, $2, $3, $4, $5)",
    [m.name, m.email, m.phone, m.role, await hashPassword(password)],
  );
  revalidatePath("/admin/socios");
  return { ok: `Cuenta creada. Contraseña temporal de ${m.name}: ${password} (apúntala, no se volverá a mostrar).` };
}

export async function updateMember(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const id = Number(formData.get("id"));
  const parsed = memberSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const m = parsed.data;
  const active = formData.get("active") === "on";
  if (id === admin.id && (m.role !== "admin" || !active)) {
    return { error: "No puedes quitarte a ti mismo el perfil de administrador ni desactivar tu cuenta." };
  }
  const duplicate = await queryOne("SELECT 1 FROM users WHERE email = $1 AND id <> $2", [m.email, id]);
  if (duplicate) return { error: "Ya existe otra cuenta con ese email." };
  await query(
    "UPDATE users SET name = $2, email = $3, phone = $4, role = $5, active = $6 WHERE id = $1",
    [id, m.name, m.email, m.phone, m.role, active],
  );
  revalidatePath("/admin/socios", "layout");
  return { ok: "Cambios guardados." };
}

export async function resetPassword(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const password = temporaryPassword();
  const user = await queryOne<{ name: string }>(
    "UPDATE users SET password_hash = $2, failed_logins = 0, locked_until = NULL WHERE id = $1 RETURNING name",
    [id, await hashPassword(password)],
  );
  if (!user) return { error: "La cuenta no existe." };
  return { ok: `Nueva contraseña temporal de ${user.name}: ${password} (apúntala, no se volverá a mostrar).` };
}

export async function deleteMember(formData: FormData) {
  const admin = await requireAdmin();
  const id = Number(formData.get("id"));
  if (id === admin.id) return;
  // Borra la cuenta y sus reservas (derecho de supresión del RGPD).
  await query("DELETE FROM users WHERE id = $1", [id]);
  revalidatePath("/admin", "layout");
  redirect("/admin/socios");
}
