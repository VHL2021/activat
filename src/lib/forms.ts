import { z } from "zod";

// Devuelve el primer mensaje de error de una validación de zod.
export function firstError(error: z.ZodError) {
  return error.issues[0]?.message ?? "Datos no válidos.";
}

export const intField = (label: string, min = 0) =>
  z.coerce
    .number({ message: `${label}: escribe un número.` })
    .int(`${label}: escribe un número entero.`)
    .min(min, `${label}: el mínimo es ${min}.`);

export const optionalText = z
  .string()
  .trim()
  .transform((value) => value || null)
  .nullable()
  .optional();
