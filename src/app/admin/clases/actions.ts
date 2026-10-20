"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/components/action-form";
import { requireAdmin } from "@/lib/auth";
import { queryOne, transaction } from "@/lib/db";
import { firstError, intField, optionalText } from "@/lib/forms";

const classSchema = z.object({
  name: z.string().trim().min(1, "Escribe el nombre de la clase."),
  description: optionalText,
  instructor: optionalText,
  duration_min: intField("Duración", 5),
  capacity: intField("Aforo", 1),
  active: z.string().optional().transform((value) => value === "on"),
});

export async function createClass(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = classSchema.safeParse({ ...Object.fromEntries(formData), active: "on" });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const c = parsed.data;
  await queryOne(
    `INSERT INTO class_types (name, description, instructor, duration_min, capacity)
     VALUES ($1, $2, $3, $4, $5)`,
    [c.name, c.description, c.instructor, c.duration_min, c.capacity],
  );
  revalidatePath("/admin", "layout");
  return { ok: `Clase "${c.name}" creada. Ahora puedes añadirla al horario.` };
}

export async function updateClass(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const parsed = classSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const c = parsed.data;
  await transaction(async (client) => {
    await client.query(
      `UPDATE class_types SET name = $2, description = $3, instructor = $4,
         duration_min = $5, capacity = $6, active = $7 WHERE id = $1`,
      [id, c.name, c.description, c.instructor, c.duration_min, c.capacity, c.active],
    );
    // Las sesiones futuras ya generadas toman el nuevo aforo y duración.
    await client.query(
      "UPDATE sessions SET capacity = $2, duration_min = $3 WHERE class_type_id = $1 AND day >= CURRENT_DATE",
      [id, c.capacity, c.duration_min],
    );
  });
  revalidatePath("/admin", "layout");
  return { ok: "Cambios guardados. Las sesiones futuras usan ya el nuevo aforo y duración." };
}

export async function deleteClass(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const used = await queryOne("SELECT 1 FROM sessions WHERE class_type_id = $1 LIMIT 1", [id]);
  if (used) {
    // Con sesiones ya creadas no se borra, para no perder el historial: se desactiva.
    await queryOne("UPDATE class_types SET active = FALSE WHERE id = $1", [id]);
  } else {
    await queryOne("DELETE FROM class_types WHERE id = $1", [id]);
  }
  revalidatePath("/admin", "layout");
  redirect("/admin/clases");
}
