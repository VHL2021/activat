import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query(readFileSync(join(__dirname, "..", "db", "schema.sql"), "utf8"));
  await client.end();
  console.log("Base de datos actualizada.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
