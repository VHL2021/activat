import "server-only";
import { TIME_ZONE } from "./dates";
import { query, queryOne } from "./db";

export type SessionRow = {
  id: number;
  day: string;
  start_time: string;
  duration_min: number;
  capacity: number;
  cancelled: boolean;
  cancel_reason: "closed" | "manual" | null;
  class_name: string;
  instructor: string | null;
  booked: number;
  waitlist: number;
};

const SESSION_SELECT = `
  SELECT s.id, s.day, s.start_time, s.duration_min, s.capacity, s.cancelled, s.cancel_reason,
    c.name AS class_name, c.instructor,
    (SELECT count(*)::int FROM bookings b WHERE b.session_id = s.id AND b.status = 'booked') AS booked,
    (SELECT count(*)::int FROM bookings b WHERE b.session_id = s.id AND b.status = 'waitlist') AS waitlist
  FROM sessions s JOIN class_types c ON c.id = s.class_type_id`;

export function listSessions(from: string, to: string) {
  return query<SessionRow>(`${SESSION_SELECT} WHERE s.day BETWEEN $1 AND $2 ORDER BY s.day, s.start_time`, [from, to]);
}

export function getSessionById(id: number) {
  return queryOne<SessionRow>(`${SESSION_SELECT} WHERE s.id = $1`, [id]);
}

export type Participant = {
  booking_id: number;
  user_id: number;
  name: string;
  email: string;
  phone: string | null;
  status: "booked" | "waitlist" | "cancelled";
  created_at: Date;
};

export function listParticipants(sessionId: number) {
  return query<Participant>(
    `SELECT b.id AS booking_id, u.id AS user_id, u.name, u.email, u.phone, b.status, b.created_at
     FROM bookings b JOIN users u ON u.id = b.user_id
     WHERE b.session_id = $1 ORDER BY b.created_at`,
    [sessionId],
  );
}

export type MemberSessionRow = SessionRow & {
  my_status: "booked" | "waitlist" | null;
  waitlist_position: number | null;
  minutes_until: number;
};

// Sesiones vistas por un socio: plazas, su reserva y su posición en la lista de espera.
export function listMemberSessions(userId: number, from: string, to: string, onlyMine = false) {
  return query<MemberSessionRow>(
    `SELECT * FROM (
       SELECT x.*, b.status AS my_status,
         CASE WHEN b.status = 'waitlist' THEN
           (SELECT count(*)::int FROM bookings w WHERE w.session_id = x.id AND w.status = 'waitlist'
              AND w.created_at <= b.created_at)
         END AS waitlist_position,
         (extract(epoch FROM ((x.day + x.start_time) AT TIME ZONE $4) - now()) / 60)::float8 AS minutes_until
       FROM (${SESSION_SELECT}) x
       LEFT JOIN bookings b ON b.session_id = x.id AND b.user_id = $1 AND b.status IN ('booked', 'waitlist')
       WHERE x.day BETWEEN $2 AND $3
     ) t
     WHERE minutes_until > 0 AND (NOT $5 OR my_status IS NOT NULL)
     ORDER BY day, start_time`,
    [userId, from, to, TIME_ZONE, onlyMine],
  );
}
