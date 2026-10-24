import { createClient } from "@supabase/supabase-js";

// La URL y la clave publicable son públicas: la seguridad la ponen los permisos (RLS) de la base de datos.
// Flujo "implicit": los enlaces de los emails funcionan aunque se abran en otro dispositivo.
export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_KEY, {
  auth: { flowType: "implicit" },
});

// Traduce los mensajes de Supabase que puede ver un usuario.
export function friendlyError(message: string) {
  if (message.includes("Invalid login credentials")) return "Email o contraseña incorrectos.";
  if (message.includes("Email not confirmed")) return "Todavía no has confirmado tu email. Revisa tu correo.";
  if (message.includes("Database error saving new user")) {
    return "Este email no está dado de alta en el gimnasio. Pídeselo al gimnasio.";
  }
  if (message.includes("User already registered")) return "Ya existe una cuenta con ese email. Entra o recupera tu contraseña.";
  if (message.toLowerCase().includes("rate limit")) return "Demasiados intentos. Espera unos minutos y vuelve a probar.";
  if (message.includes("Password should be")) return "La contraseña debe tener al menos 8 caracteres.";
  if (message.includes("New password should be different")) return "La contraseña nueva debe ser distinta de la anterior.";
  if (message.includes("duplicate key")) return "Ya existe un registro con esos datos.";
  return message;
}

type Result = { data: unknown; error: { message: string } | null };

// Devuelve los datos o lanza un error con un mensaje legible.
export async function must<R extends Result>(request: PromiseLike<R>): Promise<NonNullable<R["data"]>> {
  const { data, error } = await request;
  if (error) throw new Error(friendlyError(error.message));
  return data as NonNullable<R["data"]>;
}

export async function rpc<T = unknown>(fn: string, args?: Record<string, unknown>): Promise<T> {
  return (await must(supabase.rpc(fn, args))) as T;
}

export const siteUrl = (path: string) => new URL(import.meta.env.BASE_URL + path.replace(/^\//, ""), location.origin).toString();

export async function getSettings() {
  return must(supabase.from("settings").select().single()) as Promise<import("./types").Settings>;
}

// Convierte un campo de formulario en número entero (o lanza un error legible).
export function intField(data: FormData, name: string, label: string, min = 0) {
  const value = Number(data.get(name));
  if (!Number.isInteger(value) || value < min) throw new Error(`${label}: escribe un número entero (mínimo ${min}).`);
  return value;
}

export const textField = (data: FormData, name: string) => String(data.get(name) ?? "").trim() || null;
