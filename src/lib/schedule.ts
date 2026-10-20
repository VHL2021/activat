import "server-only";
import type { PoolClient } from "pg";
import { pool, query } from "./db";

// Crea las sesiones concretas de cada clase del horario semanal entre dos fechas (incluidas),
// saltando los días cerrados. Las sesiones que ya existen no se tocan.
export async function ensureSessions(from: string, to: string) {
  await query(
    `INSERT INTO sessions (class_type_id, slot_id, day, start_time, duration_min, capacity)
     SELECT s.class_type_id, s.id, d::date, s.start_time, c.duration_min, c.capacity
     FROM schedule_slots s
     JOIN class_types c ON c.id = s.class_type_id AND c.active
     CROSS JOIN generate_series($1::date, $2::date, interval '1 day') AS d
     WHERE extract(isodow FROM d) = s.weekday
       AND d::date >= s.valid_from
       AND (s.valid_to IS NULL OR d::date <= s.valid_to)
       AND NOT EXISTS (SELECT 1 FROM closed_days cd WHERE cd.day = d::date)
     ON CONFLICT (slot_id, day) DO NOTHING`,
    [from, to],
  );
}

// Si alguien deja una plaza libre, pasa a "apuntado" el primero de la lista de espera.
export async function promoteWaitlist(sessionId: number, client: PoolClient | typeof pool = pool) {
  const { rows } = await client.query<{ capacity: number; booked: number }>(
    `SELECT s.capacity,
       (SELECT count(*)::int FROM bookings b WHERE b.session_id = s.id AND b.status = 'booked') AS booked
     FROM sessions s WHERE s.id = $1 AND NOT s.cancelled FOR UPDATE`,
    [sessionId],
  );
  const session = rows[0];
  if (!session) return [];
  const free = session.capacity - session.booked;
  if (free <= 0) return [];
  const promoted = await client.query<{ user_id: number }>(
    `UPDATE bookings SET status = 'booked', updated_at = now()
     WHERE id IN (
       SELECT id FROM bookings WHERE session_id = $1 AND status = 'waitlist'
       ORDER BY created_at LIMIT $2
     )
     RETURNING user_id`,
    [sessionId, free],
  );
  // TODO (paso 3): avisar por email a los socios que pasan de la lista de espera a la clase.
  return promoted.rows.map((row) => row.user_id);
}
