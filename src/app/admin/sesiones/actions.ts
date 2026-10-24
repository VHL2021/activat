"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/components/action-form";
import { requireAdmin } from "@/lib/auth";
import { queryOne, transaction } from "@/lib/db";
import { firstError, intField } from "@/lib/forms";
import { notifyPromoted, notifySessionsCancelled } from "@/lib/notifications";
import { promoteWaitlist } from "@/lib/schedule";

const oneOffSchema = z.object({
  class_type_id: z.coerce.number().int().positive("Elige una clase."),
  day: z.iso.date("Elige la fecha."),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, "Escribe la hora."),
});

export async function createOneOffSession(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = oneOffSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { class_type_id, day, start_time } = parsed.data;
  const closed = await queryOne("SELECT 1 FROM closed_days WHERE day = $1", [day]);
  if (closed) return { error: "Ese día está marcado como cerrado en el calendario." };
  await queryOne(
    `INSERT INTO sessions (class_type_id, day, start_time, duration_min, capacity)
     SELECT id, $2, $3, duration_min, capacity FROM class_types WHERE id = $1`,
    [class_type_id, day, start_time],
  );
  revalidatePath("/admin", "layout");
  return { ok: "Sesión puntual creada." };
}

export async function updateCapacity(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const parsed = intField("Aforo", 1).safeParse(formData.get("capacity"));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const promoted = await transaction(async (client) => {
    await client.query("UPDATE sessions SET capacity = $2 WHERE id = $1", [id, parsed.data]);
    return promoteWaitlist(id, client);
  });
  notifyPromoted(id, promoted);
  revalidatePath("/admin", "layout");
  return {
    ok: promoted.length
      ? `Aforo guardado. ${promoted.length} persona(s) de la lista de espera han entrado en la clase.`
      : "Aforo guardado.",
  };
}

export async function setSessionCancelled(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const cancelled = formData.get("cancelled") === "1";
  await queryOne(
    "UPDATE sessions SET cancelled = $2, cancel_reason = CASE WHEN $2 THEN 'manual' END WHERE id = $1",
    [id, cancelled],
  );
  if (cancelled) notifySessionsCancelled([id]);
  revalidatePath("/admin", "layout");
}

export async function addParticipant(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const sessionId = Number(formData.get("session_id"));
  const userId = Number(formData.get("user_id"));
  const force = formData.get("force") === "on";
  if (!userId) return { error: "Elige un socio." };

  return transaction(async (client) => {
    const { rows } = await client.query<{ capacity: number; booked: number; cancelled: boolean }>(
      `SELECT capacity, cancelled,
         (SELECT count(*)::int FROM bookings WHERE session_id = s.id AND status = 'booked') AS booked
       FROM sessions s WHERE id = $1 FOR UPDATE`,
      [sessionId],
    );
    const session = rows[0];
    if (!session) return { error: "La sesión no existe." };
    if (session.cancelled) return { error: "La sesión está cancelada." };
    const existing = await client.query<{ status: string }>(
      "SELECT status FROM bookings WHERE session_id = $1 AND user_id = $2",
      [sessionId, userId],
    );
    if (existing.rows[0]?.status === "booked") return { error: "Ese socio ya está apuntado." };
    const full = session.booked >= session.capacity;
    const status = full && !force ? "waitlist" : "booked";
    await client.query(
      `INSERT INTO bookings (session_id, user_id, status) VALUES ($1, $2, $3)
       ON CONFLICT (session_id, user_id) DO UPDATE
         SET status = EXCLUDED.status, created_at = now(), updated_at = now()`,
      [sessionId, userId, status],
    );
    revalidatePath("/admin", "layout");
    return { ok: status === "booked" ? "Socio apuntado." : "La sesión está llena: el socio queda en lista de espera." };
  });
}

export async function removeParticipant(formData: FormData) {
  await requireAdmin();
  const bookingId = Number(formData.get("booking_id"));
  const result = await transaction(async (client) => {
    const { rows } = await client.query<{ session_id: number }>(
      "UPDATE bookings SET status = 'cancelled', updated_at = now() WHERE id = $1 RETURNING session_id",
      [bookingId],
    );
    if (!rows[0]) return null;
    return { sessionId: rows[0].session_id, promoted: await promoteWaitlist(rows[0].session_id, client) };
  });
  if (result) notifyPromoted(result.sessionId, result.promoted);
  revalidatePath("/admin", "layout");
}
