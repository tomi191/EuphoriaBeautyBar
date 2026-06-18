"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { requireStaff } from "@/lib/actions/auth-guard";
import { sofiaWallToUtc } from "@/lib/booking/time";

const hoursSchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    openTime: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
    closeTime: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
    closed: z.boolean(),
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
});

/** Добавя почивка/отпуск (блокирано време) за изпълнителя. */
export async function addMyTimeOff(input: z.infer<typeof timeOffSchema>) {
  const { resource } = await requireStaff();
  const d = timeOffSchema.parse(input);
  const start = sofiaWallToUtc(d.dateStr, d.fromTime);
  const end = sofiaWallToUtc(d.dateStr, d.toTime);
  if (end <= start) return { ok: false as const, error: "Краят трябва да е след началото." };
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
