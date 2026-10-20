import "server-only";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";

export type SessionData = { userId?: number };

export const SESSION_COOKIE = "gym_session";

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), {
    password: process.env.SESSION_PASSWORD!,
    cookieName: SESSION_COOKIE,
    ttl: 60 * 60 * 24 * 7,
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  });
}
