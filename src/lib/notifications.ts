import "server-only";
import { after } from "next/server";
import { query } from "./db";
import { formatDate, formatTime } from "./dates";
import { appUrl, sendEmail } from "./email";

// Los avisos se envían cuando la respuesta ya ha salido, para que el socio no espere al email.

type Recipient = { name: string; email: string; class_name: string; day: string; start_time: string };

const describe = (r: Recipient) =>
  `${r.class_name} del ${formatDate(r.day).toLowerCase()} a las ${formatTime(r.start_time)}`;

export function notifyPromoted(sessionId: number, userIds: number[]) {
  if (userIds.length === 0) return;
  after(async () => {
    const rows = await query<Recipient>(
      `SELECT u.name, u.email, c.name AS class_name, s.day, s.start_time
       FROM users u, sessions s JOIN class_types c ON c.id = s.class_type_id
       WHERE s.id = $1 AND u.id = ANY($2)`,
      [sessionId, userIds],
    );
    for (const r of rows) {
      await sendEmail({
        to: { email: r.email, name: r.name },
        subject: `Tienes plaza en ${r.class_name}`,
        text:
          `Hola, ${r.name}:\n\nSe ha liberado una plaza y ya estás apuntado a ${describe(r)}.\n\n` +
          `Si no puedes ir, desapúntate para dejar la plaza a otra persona: ${appUrl("/socio/mis-clases")}\n`,
      });
    }
  });
}

export function notifySessionsCancelled(sessionIds: number[]) {
  if (sessionIds.length === 0) return;
  after(async () => {
    const rows = await query<Recipient>(
      `SELECT u.name, u.email, c.name AS class_name, s.day, s.start_time
       FROM bookings b JOIN users u ON u.id = b.user_id
       JOIN sessions s ON s.id = b.session_id JOIN class_types c ON c.id = s.class_type_id
       WHERE b.session_id = ANY($1) AND b.status IN ('booked', 'waitlist') AND u.active`,
      [sessionIds],
    );
    for (const r of rows) {
      await sendEmail({
        to: { email: r.email, name: r.name },
        subject: `Clase cancelada: ${r.class_name}`,
        text:
          `Hola, ${r.name}:\n\nSe ha cancelado la clase de ${describe(r)}.\n\n` +
          `Puedes reservar otra en el horario: ${appUrl("/socio")}\n`,
      });
    }
  });
}
