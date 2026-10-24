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

export function formatMinutes(minutes: number) {
  if (minutes > 0 && minutes % 1440 === 0) return `${minutes / 1440} día(s)`;
  if (minutes > 0 && minutes % 60 === 0) return `${minutes / 60} hora(s)`;
  return `${minutes} minutos`;
}

// Primer día del mes de una fecha: "2026-10-21" -> "2026-10-01".
export const monthOf = (iso: string) => `${iso.slice(0, 7)}-01`;

export function addMonths(iso: string, months: number) {
  const date = new Date(`${monthOf(iso)}T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

export const lastDayOfMonth = (iso: string) => addDays(addMonths(iso, 1), -1);

// Las semanas (de lunes a domingo) que cubren un mes, para dibujar el calendario.
export function monthGrid(iso: string) {
  const first = monthOf(iso);
  const start = mondayOf(first);
  const end = addDays(mondayOf(lastDayOfMonth(first)), 6);
  const days: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
  return days;
}

// Ej.: "Octubre de 2026".
export function formatMonth(iso: string) {
  const text = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export const WEEKDAY_LETTERS = ["L", "M", "X", "J", "V", "S", "D"];

export const dayNumber = (iso: string) => Number(iso.slice(8));
