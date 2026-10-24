import "server-only";
import type { PoolClient } from "pg";
import { transaction } from "./db";
import { TIME_ZONE } from "./dates";
import { promoteWaitlist } from "./schedule";
import { getSettings, type Settings } from "./settings";

// Reglas de reserva de los socios. Todas las comprobaciones se hacen dentro de una transacción
// que bloquea la sesión, para que dos socios no puedan quedarse a la vez con la última plaza.

export class BookingError extends Error {}

type LockedSession = {
  id: number;
  day: string;
  capacity: number;
  cancelled: boolean;
  minutes_until: number;
  days_ahead: number;
};

async function lockSession(client: PoolClient, sessionId: number) {
  const { rows } = await client.query<LockedSession>(
    `SELECT id, day, capacity, cancelled,
       (extract(epoch FROM ((day + start_time) AT TIME ZONE $2) - now()) / 60)::float8 AS minutes_until,
       day - (now() AT TIME ZONE $2)::date AS days_ahead
     FROM sessions WHERE id = $1 FOR UPDATE`,
    [sessionId, TIME_ZONE],
  );
  return rows[0] ?? null;
}

async function book(
  client: PoolClient,
  settings: Settings,
  userId: number,
  sessionId: number,
  requireSpot = false,
) {
  const session = await lockSession(client, sessionId);
  if (!session || session.cancelled) throw new BookingError("Esta clase no está disponible.");
  if (session.minutes_until <= 0) throw new BookingError("Esta clase ya ha empezado.");
  if (session.minutes_until < settings.bookingCloseMinutes) {
    throw new BookingError(`Las reservas se cierran ${settings.bookingCloseMinutes} minutos antes de la clase.`);
  }
  if (session.days_ahead > settings.maxDaysAhead) {
    throw new BookingError(`Solo se puede reservar con ${settings.maxDaysAhead} días de antelación.`);
  }

  const { rows: existing } = await client.query<{ status: string }>(
    "SELECT status FROM bookings WHERE session_id = $1 AND user_id = $2",
    [sessionId, userId],
  );
  if (existing[0]?.status === "booked") throw new BookingError("Ya estás apuntado a esta clase.");
  if (existing[0]?.status === "waitlist") throw new BookingError("Ya estás en la lista de espera de esta clase.");

  const { rows: counts } = await client.query<{ active: number; same_day: number }>(
    `SELECT count(*)::int AS active, count(*) FILTER (WHERE s.day = $2)::int AS same_day
     FROM bookings b JOIN sessions s ON s.id = b.session_id
     WHERE b.user_id = $1 AND b.status IN ('booked', 'waitlist') AND NOT s.cancelled
       AND ((s.day + s.start_time) AT TIME ZONE $3) > now()`,
    [userId, session.day, TIME_ZONE],
  );
  if (settings.maxActiveBookings > 0 && counts[0].active >= settings.maxActiveBookings) {
    throw new BookingError(`Puedes tener como máximo ${settings.maxActiveBookings} reservas a la vez.`);
  }
  if (settings.maxPerDay > 0 && counts[0].same_day >= settings.maxPerDay) {
    throw new BookingError(
      settings.maxPerDay === 1
        ? "Ya tienes una clase ese día. Si quieres otra, usa «Cambiar» en Mis clases."
        : `Puedes reservar como máximo ${settings.maxPerDay} clases por día.`,
    );
  }

  const { rows: booked } = await client.query<{ n: number }>(
    "SELECT count(*)::int AS n FROM bookings WHERE session_id = $1 AND status = 'booked'",
    [sessionId],
  );
  const full = booked[0].n >= session.capacity;
  if (full && (requireSpot || !settings.waitlistEnabled)) throw new BookingError("La clase está completa.");
  const status = full ? "waitlist" : "booked";
  await client.query(
    `INSERT INTO bookings (session_id, user_id, status) VALUES ($1, $2, $3)
     ON CONFLICT (session_id, user_id) DO UPDATE
       SET status = EXCLUDED.status, created_at = now(), updated_at = now()`,
    [sessionId, userId, status],
  );
  return status;
}

async function cancel(client: PoolClient, settings: Settings, userId: number, sessionId: number) {
  const session = await lockSession(client, sessionId);
  const { rows } = await client.query<{ id: number; status: string }>(
    "SELECT id, status FROM bookings WHERE session_id = $1 AND user_id = $2 AND status IN ('booked', 'waitlist')",
    [sessionId, userId],
  );
  const booking = rows[0];
  if (!session || !booking) throw new BookingError("No tienes reserva en esta clase.");
  // Salir de la lista de espera se puede siempre; dejar una plaza, solo dentro del plazo.
  if (booking.status === "booked" && !session.cancelled) {
    if (session.minutes_until <= 0) throw new BookingError("Esta clase ya ha empezado.");
    if (session.minutes_until < settings.cancelDeadlineMinutes) {
      throw new BookingError(
        `Solo puedes desapuntarte hasta ${formatMinutes(settings.cancelDeadlineMinutes)} antes de la clase.`,
      );
    }
  }
  await client.query("UPDATE bookings SET status = 'cancelled', updated_at = now() WHERE id = $1", [booking.id]);
  if (booking.status === "booked") await promoteWaitlist(sessionId, client);
}

export async function bookSession(userId: number, sessionId: number) {
  const settings = await getSettings();
  return transaction((client) => book(client, settings, userId, sessionId));
}

export async function cancelBooking(userId: number, sessionId: number) {
  const settings = await getSettings();
  await transaction((client) => cancel(client, settings, userId, sessionId));
}

// Cambiar de clase: se desapunta de una y se apunta a otra a la vez. Si algo falla, no cambia nada.
export async function switchBooking(userId: number, fromSessionId: number, toSessionId: number) {
  const settings = await getSettings();
  return transaction(async (client) => {
    await cancel(client, settings, userId, fromSessionId);
    return book(client, settings, userId, toSessionId, true);
  });
}

export function formatMinutes(minutes: number) {
  if (minutes % 1440 === 0) return `${minutes / 1440} día(s)`;
  if (minutes % 60 === 0) return `${minutes / 60} hora(s)`;
  return `${minutes} minutos`;
}
