"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/components/action-form";
import { requireAdmin } from "@/lib/auth";
import { firstError, intField } from "@/lib/forms";
import { saveSettings } from "@/lib/settings";

const settingsSchema = z.object({
  maxDaysAhead: intField("Antelación máxima", 1),
  bookingCloseMinutes: intField("Cierre de reservas"),
  cancelDeadlineMinutes: intField("Plazo para desapuntarse"),
  maxActiveBookings: intField("Reservas activas por socio"),
  maxPerDay: intField("Clases por día"),
  waitlistEnabled: z.string().optional().transform((value) => value === "on"),
  defaultCapacity: intField("Aforo por defecto", 1),
});

export async function updateSettings(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = settingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  await saveSettings(parsed.data);
  revalidatePath("/", "layout");
  return { ok: "Ajustes guardados." };
}
