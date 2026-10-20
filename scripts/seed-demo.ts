// Carga datos de ejemplo (inventados) para probar la web. No usar con socios reales.
import { hash } from "@node-rs/argon2";
import { Client } from "pg";

const MEMBERS = [
  ["Laura Martínez", "laura@ejemplo.com", "600111222"],
  ["Jorge Pérez", "jorge@ejemplo.com", "600333444"],
  ["Marta Gómez", "marta@ejemplo.com", null],
  ["Pablo Ruiz", "pablo@ejemplo.com", "600555666"],
  ["Ana López", "ana@ejemplo.com", null],
];

const CLASSES: [string, string, number, number, [number, string][]][] = [
  ["Spinning", "Carlos", 45, 12, [[1, "18:00"], [3, "18:00"], [5, "18:00"]]],
  ["Yoga", "Elena", 60, 15, [[2, "10:00"], [4, "10:00"]]],
  ["Pilates", "Elena", 50, 10, [[1, "09:30"], [3, "09:30"], [6, "11:00"]]],
  ["Body Pump", "Carlos", 55, 20, [[2, "19:00"], [4, "19:00"]]],
];

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const passwordHash = await hash("socio1234");
  for (const [name, email, phone] of MEMBERS) {
    await client.query(
      `INSERT INTO users (name, email, phone, role, password_hash) VALUES ($1, $2, $3, 'member', $4)
       ON CONFLICT (email) DO NOTHING`,
      [name, email, phone, passwordHash],
    );
  }
  for (const [name, instructor, duration, capacity, slots] of CLASSES) {
    const existing = await client.query("SELECT id FROM class_types WHERE name = $1", [name]);
    if (existing.rows.length) continue;
    const { rows } = await client.query(
      "INSERT INTO class_types (name, instructor, duration_min, capacity) VALUES ($1, $2, $3, $4) RETURNING id",
      [name, instructor, duration, capacity],
    );
    for (const [weekday, time] of slots) {
      await client.query(
        "INSERT INTO schedule_slots (class_type_id, weekday, start_time, valid_from) VALUES ($1, $2, $3, CURRENT_DATE)",
        [rows[0].id, weekday, time],
      );
    }
  }
  await client.end();
  console.log("Datos de ejemplo cargados. Los socios de ejemplo entran con la contraseña: socio1234");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
