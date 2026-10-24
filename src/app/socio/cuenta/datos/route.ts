import { getCurrentUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";

// Exporta los datos personales del socio (derecho de acceso del RGPD).
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("No autorizado", { status: 401 });
  const [profile, bookings] = await Promise.all([
    queryOne("SELECT name, email, phone, role, created_at FROM users WHERE id = $1", [user.id]),
    query(
      `SELECT c.name AS clase, s.day AS fecha, s.start_time AS hora, b.status AS estado, b.created_at AS reservado_el
       FROM bookings b JOIN sessions s ON s.id = b.session_id JOIN class_types c ON c.id = s.class_type_id
       WHERE b.user_id = $1 ORDER BY s.day, s.start_time`,
      [user.id],
    ),
  ]);
  return new Response(JSON.stringify({ datos: profile, reservas: bookings }, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="mis-datos.json"',
      "Cache-Control": "no-store",
    },
  });
}
