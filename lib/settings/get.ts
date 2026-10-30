import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { SETTINGS, type SettingValue } from "./registry";

export type Settings = Record<string, SettingValue>;

/** All settings, with registry defaults for keys missing from the database. */
export const getSettings = cache(async (): Promise<Settings> => {
  const out: Settings = Object.fromEntries(SETTINGS.map((s) => [s.key, s.defaultValue]));
  try {
    const rows = await db.setting.findMany();
    for (const row of rows) out[row.key] = row.value as SettingValue;
  } catch {
    // Database unavailable: render with defaults rather than failing the page.
  }
  return out;
});

export async function getSetting(key: string): Promise<SettingValue> {
  return (await getSettings())[key] ?? "";
}
