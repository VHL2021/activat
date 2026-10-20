import "server-only";
import { Pool, types, type PoolClient, type QueryResultRow } from "pg";

// Las fechas (DATE) se devuelven como texto "AAAA-MM-DD", sin conversión de zona horaria.
types.setTypeParser(types.builtins.DATE, (value) => value);

const globalForPool = globalThis as unknown as { pgPool?: Pool };

export const pool =
  globalForPool.pgPool ?? new Pool({ connectionString: process.env.DATABASE_URL });

if (process.env.NODE_ENV !== "production") globalForPool.pgPool = pool;

export async function query<T extends QueryResultRow>(text: string, params: unknown[] = []) {
  const result = await pool.query<T>(text, params);
  return result.rows;
}

export async function queryOne<T extends QueryResultRow>(text: string, params: unknown[] = []) {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export async function transaction<T>(fn: (client: PoolClient) => Promise<T>) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
