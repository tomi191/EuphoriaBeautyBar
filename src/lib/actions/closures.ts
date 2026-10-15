"use server";

import { revalidatePath } from "next/cache";
import { eq, inArray, gte, lt, and } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireAdmin } from "@/lib/actions/auth-guard";
import { CLOSURES_KEY } from "@/lib/booking/closures";
import { sofiaWallToUtc } from "@/lib/booking/time";
import { conflictMessage, isValidDateStr } from "@/lib/booking/input-guards";

/**
 * Атомарна промяна на JSON масива със затворени дати. Преди беше read-modify-write
 * през два отделни заявки → два паралелни клика (или два админа) си губеха датите.
 * Сега: гарантираме реда (onConflictDoNothing) и го заключваме с FOR UPDATE в
 * транзакция, така че втората заявка чака и чете вече обновения масив.
 */
async function mutateClosures(fn: (dates: string[]) => string[]): Promise<string[]> {
  const result = await db.transaction(async (tx) => {
    await tx.insert(schema.siteSettings).values({ key: CLOSURES_KEY, value: [], updatedAt: new Date() }).onConflictDoNothing();
    const [row] = await tx.select().from(schema.siteSettings).where(eq(schema.siteSettings.key, CLOSURES_KEY)).for("update");
    const current = Array.isArray(row?.value) ? (row.value as string[]) : [];
    const next = fn([...current]);
    await tx
      .update(schema.siteSettings)
      .set({ value: next, updatedAt: new Date() })
      .where(eq(schema.siteSettings.key, CLOSURES_KEY));
    return next;
  });
  revalidatePath("/admin/settings");
  revalidatePath("/zapazi-chas");
  revalidatePath("/");
  return result;
}

/**
 * Добавя затворен ден (YYYY-MM-DD). Затварянето не отменя часове: ако в деня има
 * записани (confirmed/arrived) при който и да е изпълнител, питаме (force).
 */
export async function addClosedDate(date: string, force?: boolean) {
  await requireAdmin();
  if (!isValidDateStr(date)) return { ok: false as const, error: "Невалидна дата." };
  if (!force) {
    const dayStart = sofiaWallToUtc(date, "00:00");
    const dayEnd = new Date(dayStart.getTime() + 24 * 3600 * 1000); // DST: 23/25 ч. дни са гранични, приемливо за броене
    const clash = await db
      .select({ id: schema.bookings.id })
      .from(schema.bookings)
      .where(
        and(
          inArray(schema.bookings.status, ["confirmed", "arrived"]),
          gte(schema.bookings.startAt, dayStart),
          lt(schema.bookings.startAt, dayEnd),
        ),
      );
    if (clash.length > 0) {
      return { ok: false as const, conflicts: clash.length, error: conflictMessage(clash.length) };
    }
  }
  const dates = await mutateClosures((cur) => (cur.includes(date) ? cur : [...cur, date].sort()));
  return { ok: true as const, dates };
}

/** Премахва затворен ден. */
export async function removeClosedDate(date: string) {
  await requireAdmin();
  const dates = await mutateClosures((cur) => cur.filter((d) => d !== date));
  return { ok: true as const, dates };
}
