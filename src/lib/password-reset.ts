import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { hashPassword } from "./auth";
import { query, queryOne, transaction } from "./db";
import { appUrl, sendEmail } from "./email";

const VALID_MINUTES = 60;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

// Envía un enlace para elegir contraseña nueva. Si el email no existe no se dice, para no revelar quién es socio.
export async function requestPasswordReset(email: string) {
  const user = await queryOne<{ id: number; name: string; email: string }>(
    "SELECT id, name, email FROM users WHERE email = lower($1) AND active",
    [email.trim()],
  );
  if (!user) return;
  const recent = await queryOne(
    "SELECT 1 FROM password_resets WHERE user_id = $1 AND expires_at > now() + interval '58 minutes'",
    [user.id],
  );
  if (recent) return; // como mucho un email cada 2 minutos
  const token = randomBytes(32).toString("base64url");
  await query("DELETE FROM password_resets WHERE user_id = $1", [user.id]);
  await query(
    "INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($1, $2, now() + make_interval(mins => $3))",
    [user.id, hashToken(token), VALID_MINUTES],
  );
  await sendEmail({
    to: { email: user.email, name: user.name },
    subject: "Recupera tu contraseña",
    text:
      `Hola, ${user.name}:\n\nPara elegir una contraseña nueva, abre este enlace (vale durante ${VALID_MINUTES} minutos):\n` +
      `${appUrl(`/recuperar/${token}`)}\n\nSi no lo has pedido tú, ignora este email.\n`,
  });
}

export async function isValidResetToken(token: string) {
  return !!(await queryOne(
    "SELECT 1 FROM password_resets WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()",
    [hashToken(token)],
  ));
}

export async function resetPasswordWithToken(token: string, password: string) {
  const passwordHash = await hashPassword(password);
  return transaction(async (client) => {
    const { rows } = await client.query<{ user_id: number }>(
      `UPDATE password_resets SET used_at = now()
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now() RETURNING user_id`,
      [hashToken(token)],
    );
    if (!rows[0]) return false;
    await client.query(
      "UPDATE users SET password_hash = $2, failed_logins = 0, locked_until = NULL WHERE id = $1",
      [rows[0].user_id, passwordHash],
    );
    return true;
  });
}
