"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { requireStaff } from "@/lib/actions/auth-guard";

const hoursSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  openTime: z.string().nullable(),
  closeTime: z.string().nullable(),
  closed: z.boolean(),
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
  startAt: z.string(),
  endAt: z.string(),
  reason: z.string().nullable().optional(),
});

/** Добавя почивка/отпуск (блокирано време) за изпълнителя. */
export async function addMyTimeOff(input: z.infer<typeof timeOffSchema>) {
  const { resource } = await requireStaff();
  const d = timeOffSchema.parse(input);
  const start = new Date(d.startAt);
  const end = new Date(d.endAt);
  if (end <= start) return { ok: false as const, error: "Краят трябва да е след началото." };
  await db.insert(schema.timeOff).values({
    id: nanoid(),
    resourceId: resource.id,
    startAt: start,
    endAt: end,
    reason: d.reason ?? null,
    createdAt: new Date(),
  });
  revalidatePath("/staff/hours");
  revalidatePath("/zapazi-chas");
  return { ok: true as const };
}

/** Премахва почивка/отпуск (само своя). */
export async function deleteMyTimeOff(id: string) {
  const { resource } = await requireStaff();
  await db.delete(schema.timeOff).where(and(eq(schema.timeOff.id, id), eq(schema.timeOff.resourceId, resource.id)));
  revalidatePath("/staff/hours");
  revalidatePath("/zapazi-chas");
  return { ok: true as const };
}
