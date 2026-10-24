"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/components/action-form";
import { requireAdmin } from "@/lib/auth";
import { query, transaction } from "@/lib/db";
import { firstError, optionalText } from "@/lib/forms";
import { notifySessionsCancelled } from "@/lib/notifications";

const closedDaysSchema = z
  .object({
    from: z.iso.date("Elige la fecha de inicio."),
    to: z.union([z.iso.date(), z.literal("")]),
    kind: z.enum(["festivo", "vacaciones", "otro"]),
    reason: optionalText,
  })
  .refine((data) => !data.to || data.to >= data.from, "La fecha final no puede ser anterior a la inicial.");

export async function addClosedDays(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = closedDaysSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { from, kind, reason } = parsed.data;
  const to = parsed.data.to || from;

  const result = await transaction(async (client) => {
    const days = await client.query(
      `INSERT INTO closed_days (day, kind, reason)
       SELECT d::date, $3, $4 FROM generate_series($1::date, $2::date, interval '1 day') AS d
       ON CONFLICT (day) DO UPDATE SET kind = EXCLUDED.kind, reason = EXCLUDED.reason`,
      [from, to, kind, reason],
    );
    const sessions = await client.query<{ id: number; bookings: number }>(
      `UPDATE sessions SET cancelled = TRUE, cancel_reason = 'closed'
       WHERE day BETWEEN $1 AND $2 AND NOT cancelled
       RETURNING id, (SELECT count(*)::int FROM bookings b WHERE b.session_id = sessions.id AND b.status <> 'cancelled') AS bookings`,
      [from, to],
    );
    const affected = sessions.rows.reduce((sum, row) => sum + row.bookings, 0);
    return { days: days.rowCount ?? 0, sessions: sessions.rowCount ?? 0, affected, ids: sessions.rows.map((r) => r.id) };
  });
  notifySessionsCancelled(result.ids);

  revalidatePath("/admin", "layout");
  let message = `Guardado: ${result.days} día(s) cerrado(s).`;
  if (result.sessions > 0) {
    message += ` Se han cancelado ${result.sessions} sesión(es) con ${result.affected} reserva(s).`;
  }
  return { ok: message };
}

export async function deleteClosedDay(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  await transaction(async (client) => {
    const { rows } = await client.query<{ day: string }>(
      "DELETE FROM closed_days WHERE id = $1 RETURNING day",
      [id],
    );
    if (rows[0]) {
      // Reabre las sesiones que se cancelaron solo por ser día cerrado.
      await client.query(
        "UPDATE sessions SET cancelled = FALSE, cancel_reason = NULL WHERE day = $1 AND cancel_reason = 'closed'",
        [rows[0].day],
      );
    }
  });
  revalidatePath("/admin", "layout");
}

export async function listClosedDays(includePast: boolean) {
  return query<{ id: number; day: string; kind: string; reason: string | null }>(
    `SELECT id, day, kind, reason FROM closed_days
     WHERE $1 OR day >= CURRENT_DATE ORDER BY day`,
    [includePast],
  );
}
