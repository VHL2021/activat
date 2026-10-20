"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/components/action-form";
import { requireAdmin } from "@/lib/auth";
import { transaction } from "@/lib/db";
import { firstError } from "@/lib/forms";

const slotSchema = z.object({
  class_type_id: z.coerce.number().int().positive("Elige una clase."),
  weekdays: z.array(z.coerce.number().int().min(1).max(7)).min(1, "Elige al menos un día."),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, "Escribe la hora (por ejemplo 18:30)."),
  valid_from: z.iso.date("Elige desde qué fecha empieza."),
});

export async function addSlots(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = slotSchema.safeParse({
    ...Object.fromEntries(formData),
    weekdays: formData.getAll("weekdays"),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { class_type_id, weekdays, start_time, valid_from } = parsed.data;
  await transaction(async (client) => {
    for (const weekday of weekdays) {
      await client.query(
        "INSERT INTO schedule_slots (class_type_id, weekday, start_time, valid_from) VALUES ($1, $2, $3, $4)",
        [class_type_id, weekday, start_time, valid_from],
      );
    }
  });
  revalidatePath("/admin", "layout");
  return { ok: `Añadida al horario (${weekdays.length} día(s) a la semana).` };
}

export async function removeSlot(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  await transaction(async (client) => {
    // Las sesiones futuras sin reservas desaparecen; las que tienen reservas se mantienen
    // para que el administrador decida si las cancela.
    await client.query(
      `DELETE FROM sessions s WHERE s.slot_id = $1 AND s.day >= CURRENT_DATE
         AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.session_id = s.id AND b.status <> 'cancelled')`,
      [id],
    );
    const { rows } = await client.query("SELECT 1 FROM sessions WHERE slot_id = $1 LIMIT 1", [id]);
    if (rows.length === 0) {
      await client.query("DELETE FROM schedule_slots WHERE id = $1", [id]);
    } else {
      // Deja de generar sesiones nuevas; las ya creadas con reservas siguen existiendo.
      await client.query("UPDATE schedule_slots SET valid_to = CURRENT_DATE - 1 WHERE id = $1", [id]);
    }
  });
  revalidatePath("/admin", "layout");
}
