import { getCurrentUser } from "@/lib/auth";
import { csvResponse } from "@/lib/csv";
import { formatTime } from "@/lib/dates";
import { getSessionById, listParticipants } from "@/lib/sessions";

const STATUS_LABELS = { booked: "Apuntado", waitlist: "Lista de espera", cancelled: "Desapuntado" };

export async function GET(_: Request, { params }: RouteContext<"/admin/sesiones/[id]/csv">) {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return new Response("No autorizado", { status: 403 });
  const id = Number((await params).id) || 0;
  const session = await getSessionById(id);
  if (!session) return new Response("No encontrada", { status: 404 });
  const participants = await listParticipants(id);
  const rows = [
    ["Nombre", "Email", "Teléfono", "Estado"],
    ...participants
      .filter((p) => p.status !== "cancelled")
      .map((p) => [p.name, p.email, p.phone, STATUS_LABELS[p.status]]),
  ];
  const slug = session.class_name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return csvResponse(`${slug}-${session.day}-${formatTime(session.start_time).replace(":", "")}.csv`, rows);
}
