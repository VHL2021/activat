// Crea (o actualiza) una cuenta de administrador.
// Uso: npm run create-admin -- email@ejemplo.com "Nombre" contraseña
import { hash } from "@node-rs/argon2";
import { Client } from "pg";

async function main() {
  const [email, name, password] = process.argv.slice(2);
  if (!email || !name || !password || password.length < 8) {
    console.error('Uso: npm run create-admin -- email "Nombre" contraseña (mínimo 8 caracteres)');
    process.exit(1);
  }
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query(
    `INSERT INTO users (name, email, role, password_hash)
     VALUES ($1, lower($2), 'admin', $3)
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, role = 'admin',
       password_hash = EXCLUDED.password_hash, active = TRUE, failed_logins = 0, locked_until = NULL`,
    [name, email, await hash(password)],
  );
  await client.end();
  console.log(`Administrador ${email} listo.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
