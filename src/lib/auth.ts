import "server-only";
import { hash, verify } from "@node-rs/argon2";
import { redirect } from "next/navigation";
import { cache } from "react";
import { query, queryOne } from "./db";
import { getSession } from "./session";

export type CurrentUser = { id: number; name: string; email: string; role: "admin" | "member" };

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;

export const hashPassword = (password: string) => hash(password);

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await getSession();
  if (!session.userId) return null;
  return queryOne<CurrentUser>(
    "SELECT id, name, email, role FROM users WHERE id = $1 AND active",
    [session.userId],
  );
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/socio");
  return user;
}

type LoginRow = {
  id: number;
  password_hash: string;
  active: boolean;
  role: "admin" | "member";
  locked_until: Date | null;
};

export async function login(email: string, password: string) {
  const user = await queryOne<LoginRow>(
    "SELECT id, password_hash, active, role, locked_until FROM users WHERE email = lower($1)",
    [email.trim()],
  );
  if (!user || !user.active) return { error: "Email o contraseña incorrectos." };
  if (user.locked_until && user.locked_until > new Date()) {
    return { error: `Demasiados intentos fallidos. Prueba de nuevo en ${LOCK_MINUTES} minutos.` };
  }
  if (!(await verify(user.password_hash, password))) {
    await query(
      `UPDATE users SET failed_logins = failed_logins + 1,
         locked_until = CASE WHEN failed_logins + 1 >= $2
           THEN now() + make_interval(mins => $3) ELSE NULL END
       WHERE id = $1`,
      [user.id, MAX_FAILED_LOGINS, LOCK_MINUTES],
    );
    return { error: "Email o contraseña incorrectos." };
  }
  await query("UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = $1", [user.id]);
  const session = await getSession();
  session.userId = user.id;
  await session.save();
  return { role: user.role };
}

export async function logout() {
  const session = await getSession();
  session.destroy();
}
