import { getCurrentUser } from "@/lib/auth";
import { csvResponse } from "@/lib/csv";
import { query } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return new Response("No autorizado", { status: 403 });
  const members = await query<{ name: string; email: string; phone: string | null; role: string; active: boolean }>(
    "SELECT name, email, phone, role, active FROM users ORDER BY name",
  );
  return csvResponse("socios.csv", [
    ["Nombre", "Email", "Teléfono", "Perfil", "Activo"],
    ...members.map((m) => [m.name, m.email, m.phone, m.role === "admin" ? "Administrador" : "Socio", m.active ? "Sí" : "No"]),
  ]);
}
