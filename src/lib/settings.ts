import "server-only";
import { query } from "./db";

export type Settings = {
  maxDaysAhead: number;
  bookingCloseMinutes: number;
  cancelDeadlineMinutes: number;
  maxActiveBookings: number; // 0 = sin límite
  maxPerDay: number; // 0 = sin límite
  waitlistEnabled: boolean;
  defaultCapacity: number;
};

export const DEFAULT_SETTINGS: Settings = {
  maxDaysAhead: 7,
  bookingCloseMinutes: 60,
  cancelDeadlineMinutes: 120,
  maxActiveBookings: 0,
  maxPerDay: 1,
  waitlistEnabled: true,
  defaultCapacity: 20,
};

export async function getSettings(): Promise<Settings> {
  const rows = await query<{ key: keyof Settings; value: never }>("SELECT key, value FROM settings");
  const settings = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    if (row.key in settings) (settings as Record<string, unknown>)[row.key] = row.value;
  }
  return settings;
}

export async function saveSettings(settings: Settings) {
  for (const [key, value] of Object.entries(settings)) {
    await query(
      `INSERT INTO settings (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [key, JSON.stringify(value)],
    );
  }
}
