import { db } from "@/lib/db";

/**
 * Салонни затворени дни (нац. празници, отпуск, извънредно затваряне). Пазят се
 * като JSON масив от „YYYY-MM-DD" в site_settings (key-value) → без нова таблица
 * и без миграция. Празник = денят се третира като затворен за ВСИЧКИ изпълнители.
 */
export const CLOSURES_KEY = "salon_closures";

/** Затворените дати (YYYY-MM-DD). */
export async function getClosedDates(): Promise<string[]> {
  const row = await db.query.siteSettings.findFirst({ where: (s, { eq }) => eq(s.key, CLOSURES_KEY) });
  const v = row?.value;
  return Array.isArray(v) ? (v as string[]) : [];
}

/** Дали салонът е затворен на дадена дата. */
export async function isClosed(dateStr: string): Promise<boolean> {
  return (await getClosedDates()).includes(dateStr);
}
