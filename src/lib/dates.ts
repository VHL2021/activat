// Utilidades de fechas. Las fechas se manejan como texto "AAAA-MM-DD" en hora local del gimnasio.

export const WEEKDAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export const TIME_ZONE = "Europe/Madrid";

export function todayISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date());
}

export function addDays(iso: string, days: number) {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// 1 = lunes ... 7 = domingo
export function weekdayOf(iso: string) {
  const day = new Date(`${iso}T12:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

export function mondayOf(iso: string) {
  return addDays(iso, 1 - weekdayOf(iso));
}

// Ej.: "Miércoles, 21 de octubre" (solo la primera letra en mayúscula).
export function formatDate(iso: string, options: Intl.DateTimeFormatOptions = {}) {
  const text = new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    ...options,
  }).format(new Date(`${iso}T12:00:00Z`));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export const formatTime = (time: string) => time.slice(0, 5);
