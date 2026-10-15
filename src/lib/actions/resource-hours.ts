"use server";

import { revalidatePath } from "next/cache";
import { and, eq, gt, inArray, lt } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { requireStaff } from "@/lib/actions/auth-guard";
import { sofiaDateStr, sofiaTimeLabel, sofiaWallToUtc, sofiaWeekday } from "@/lib/booking/time";
import { conflictMessage, isNarrowed, isOutsideHours, isValidDateStr, isValidTimeStr } from "@/lib/booking/input-guards";

const hoursSchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    openTime: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
    closeTime: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
    closed: z.boolean(),
    // true = изпълнителят е видял предупреждението за засегнати часове и държи на промяната.
    force: z.boolean().optional(),
  })
  .refine((d) => d.closed || (!!d.openTime && !!d.closeTime && d.openTime < d.closeTime), {
    message: "Краят трябва да е след началото.",
  });

/** Задава собственото работно време на изпълнителя за даден ден от седмицата. */
export async function setMyWorkingHours(input: z.infer<typeof hoursSchema>) {
  const { resource } = await requireStaff();
  const d = hoursSchema.parse(input);
  const existing = await db.query.resourceWorkingHours.findFirst({
    where: (w, { and, eq }) => and(eq(w.resourceId, resource.id), eq(w.weekday, d.weekday)),
  });

  // Затваряне/стесняване на ден оставя вече записани бъдещи часове „извън" графика —
  // клиентите ги имат потвърдени. Броим ги и искаме изрично потвърждение (force).
  // Проверяваме само при реална промяна, за да не дразним при неизменени дни.
  // При ново (още несъществуващо) custom време няма „старо" → сравняваме с отворено.
  const next = { closed: d.closed, openTime: d.openTime, closeTime: d.closeTime };
  const prev = existing
    ? { closed: existing.closed, openTime: existing.openTime, closeTime: existing.closeTime }
    : { closed: false, openTime: "00:00", closeTime: "23:59" };
  if (!d.force && (next.closed !== prev.closed || isNarrowed(prev, next))) {
    const future = await db
      .select({ startAt: schema.bookings.startAt, endAt: schema.bookings.endAt })
      .from(schema.bookings)
      .where(
        and(
          eq(schema.bookings.resourceId, resource.id),
          inArray(schema.bookings.status, ["confirmed", "arrived"]),
          gt(schema.bookings.startAt, new Date()),
        ),
      );
    // Седмичният ден на часа е в Sofia, не в UTC (час в 00:30 е вече следващият ден).
    const conflicts = future.filter(
      (b) =>
        sofiaWeekday(sofiaDateStr(b.startAt)) === d.weekday &&
        isOutsideHours(sofiaTimeLabel(b.startAt), sofiaTimeLabel(b.endAt), next),
    ).length;
    if (conflicts > 0) {
      return { ok: false as const, conflicts, error: conflictMessage(conflicts) };
    }
  }
  if (existing) {
    await db
      .update(schema.resourceWorkingHours)
      .set({ openTime: d.openTime, closeTime: d.closeTime, closed: d.closed })
      .where(eq(schema.resourceWorkingHours.id, existing.id));
  } else {
    await db.insert(schema.resourceWorkingHours).values({
      id: nanoid(),
      resourceId: resource.id,
      weekday: d.weekday,
      openTime: d.openTime,
      closeTime: d.closeTime,
      closed: d.closed,
    });
  }
  revalidatePath("/staff/hours");
  revalidatePath("/zapazi-chas");
  return { ok: true as const };
}

const timeOffSchema = z.object({
  // Сурово Sofia-стенно време — UTC се смята НА СЪРВЪРА (sofiaWallToUtc, DST-safe),
  // не в браузъра (където зависеше от локалния часовник/TZ на устройството).
  dateStr: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fromTime: z.string().regex(/^\d{2}:\d{2}$/),
  toTime: z.string().regex(/^\d{2}:\d{2}$/),
  reason: z.string().nullable().optional(),
  force: z.boolean().optional(),
});

/** Добавя почивка/отпуск (блокирано време) за изпълнителя. */
export async function addMyTimeOff(input: z.infer<typeof timeOffSchema>) {
  const { resource } = await requireStaff();
  const d = timeOffSchema.parse(input);
  if (!isValidDateStr(d.dateStr) || !isValidTimeStr(d.fromTime) || !isValidTimeStr(d.toTime)) {
    return { ok: false as const, error: "Невалидна дата или час." };
  }
  if (d.dateStr < sofiaDateStr(new Date())) {
    return { ok: false as const, error: "Не можеш да добавяш почивка в миналото." };
  }
  const start = sofiaWallToUtc(d.dateStr, d.fromTime);
  const end = sofiaWallToUtc(d.dateStr, d.toTime);
  if (end <= start) return { ok: false as const, error: "Краят трябва да е след началото." };

  // Точен дубликат (същия интервал) е случаен двоен клик/повторно пращане.
  const dup = await db.query.timeOff.findFirst({
    where: (t, { and, eq }) => and(eq(t.resourceId, resource.id), eq(t.startAt, start), eq(t.endAt, end)),
    columns: { id: true },
  });
  if (dup) return { ok: false as const, error: "Тази почивка вече е добавена." };

  // Почивката не отменя часове: ако в интервала има записани, питаме (force) преди да я пуснем.
  if (!d.force) {
    const clash = await db
      .select({ id: schema.bookings.id })
      .from(schema.bookings)
      .where(
        and(
          eq(schema.bookings.resourceId, resource.id),
          inArray(schema.bookings.status, ["confirmed", "arrived"]),
          lt(schema.bookings.startAt, end),
          gt(schema.bookings.endAt, start),
        ),
      );
    if (clash.length > 0) {
      return { ok: false as const, conflicts: clash.length, error: conflictMessage(clash.length) };
    }
  }
  const id = nanoid();
  await db.insert(schema.timeOff).values({
    id,
    resourceId: resource.id,
    startAt: start,
    endAt: end,
    reason: d.reason ?? null,
    createdAt: new Date(),
  });
  revalidatePath("/staff/hours");
  revalidatePath("/zapazi-chas");
  return { ok: true as const, item: { id, startAt: start.toISOString(), endAt: end.toISOString(), reason: d.reason ?? null } };
}

/** Премахва почивка/отпуск (само своя). */
export async function deleteMyTimeOff(id: string) {
  const { resource } = await requireStaff();
  const deleted = await db
    .delete(schema.timeOff)
    .where(and(eq(schema.timeOff.id, id), eq(schema.timeOff.resourceId, resource.id)))
    .returning({ id: schema.timeOff.id });
  if (deleted.length === 0) return { ok: false as const, error: "Почивката не е намерена." };
  revalidatePath("/staff/hours");
  revalidatePath("/zapazi-chas");
  return { ok: true as const };
}
