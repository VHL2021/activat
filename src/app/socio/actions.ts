"use server";

import { verify } from "@node-rs/argon2";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/components/action-form";
import { hashPassword, requireUser } from "@/lib/auth";
import { BookingError, bookSession, cancelBooking, switchBooking } from "@/lib/bookings";
import { query, queryOne } from "@/lib/db";
import { firstError, optionalText } from "@/lib/forms";

async function run(fn: () => Promise<string>): Promise<ActionState> {
  try {
    const ok = await fn();
    revalidatePath("/", "layout");
    return { ok };
  } catch (error) {
    if (error instanceof BookingError) return { error: error.message };
    throw error;
  }
}

export async function bookAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const sessionId = Number(formData.get("session_id"));
  return run(async () => {
    const status = await bookSession(user.id, sessionId);
    return status === "booked" ? "¡Apuntado!" : "Clase completa: estás en la lista de espera.";
  });
}

export async function cancelAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const sessionId = Number(formData.get("session_id"));
  return run(async () => {
    await cancelBooking(user.id, sessionId);
    return "Te has desapuntado.";
  });
}

export async function switchAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const from = Number(formData.get("from_session_id"));
  const to = Number(formData.get("to_session_id"));
  const result = await run(async () => {
    await switchBooking(user.id, from, to);
    return "Cambio hecho.";
  });
  if (result?.ok) redirect("/socio/mis-clases?cambio=1");
  return result;
}

const passwordSchema = z
  .object({
    current: z.string().min(1, "Escribe tu contraseña actual."),
    password: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres."),
    repeat: z.string(),
  })
  .refine((data) => data.password === data.repeat, "Las dos contraseñas nuevas no coinciden.");

export async function changePasswordAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = passwordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const row = await queryOne<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = $1", [user.id]);
  if (!row || !(await verify(row.password_hash, parsed.data.current))) {
    return { error: "La contraseña actual no es correcta." };
  }
  await query("UPDATE users SET password_hash = $2 WHERE id = $1", [user.id, await hashPassword(parsed.data.password)]);
  return { ok: "Contraseña cambiada." };
}

export async function updatePhoneAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const phone = optionalText.parse(formData.get("phone") ?? "");
  await query("UPDATE users SET phone = $2 WHERE id = $1", [user.id, phone]);
  return { ok: "Datos guardados." };
}
