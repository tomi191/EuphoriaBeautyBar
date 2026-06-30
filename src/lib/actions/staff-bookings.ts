"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { requireStaff } from "@/lib/actions/auth-guard";
import { getDaySlots, hasTimeOffConflict, type DaySlot } from "@/lib/booking/slots";
import { isClosed } from "@/lib/booking/closures";
import { fitsParallelSlot } from "@/lib/booking/parallel";
import { sofiaDateStr, sofiaWallToUtc } from "@/lib/booking/time";
import { upsertClientByPhone } from "@/lib/booking/clients";

export interface DayScheduleResult {
  open: string | null;
  close: string | null;
  slots: DaySlot[];
}

/** Собствена продължителност и цена на изпълнителя за услуга (resource_services) или каталожна. */
async function ownOffering(resourceId: string, serviceItemId: string) {
  const [rs, item] = await Promise.all([
    db.query.resourceServices.findFirst({
      where: (r, { and, eq }) => and(eq(r.resourceId, resourceId), eq(r.serviceItemId, serviceItemId)),
    }),
    db.query.serviceItems.findFirst({ where: (s, { eq }) => eq(s.id, serviceItemId) }),
  ]);
  return {
    durationMin: rs?.durationMin ?? item?.durationMin ?? 30,
    bufferMin: rs?.bufferMin ?? item?.bufferMin ?? 10,
    priceEur: rs?.price ?? item?.price ?? null,
    activeMin: item?.activeMin ?? 0,
    processingMin: item?.processingMin ?? 0,
  };
}

/** Дневен график за собствения изпълнител (без мин. предизвестие — ръчно записване). */
export async function fetchMySlots(serviceItemId: string, dateStr: string): Promise<DayScheduleResult> {
  const { resource } = await requireStaff();
  const { durationMin, bufferMin, activeMin, processingMin } = await ownOffering(resource.id, serviceItemId);
  // Паралелни записи (gap booking) са активни в staff формата: услуга с престой
  // отваря записваеми слотове в чужди престои (симетрично).
  const res = await getDaySlots({
    resourceId: resource.id,
    durationMin,
    bufferMin,
    activeMin,
    processingMin,
    dateStr,
    minNoticeMin: 0,
    allowParallel: true,
  });
  return res ?? { open: null, close: null, slots: [] };
}

const bookingSchema = z.object({
  serviceItemId: z.string().min(1),
  serviceName: z.string().min(1),
  startAt: z.string(),
  clientName: z.string().min(2),
  clientPhone: z.string().min(5),
  notes: z.string().nullable().optional(),
  allowParallel: z.boolean().optional(),
});

/** Изпълнителят записва ръчно час (телефонен клиент) за себе си. */
export async function createMyBooking(input: z.infer<typeof bookingSchema>) {
  const { session, resource } = await requireStaff();
  const d = bookingSchema.parse(input);
  const { durationMin, bufferMin, priceEur, activeMin, processingMin } = await ownOffering(resource.id, d.serviceItemId);
  const start = new Date(d.startAt);
  const end = new Date(start.getTime() + (durationMin + bufferMin) * 60000);

  if (await isClosed(sofiaDateStr(start))) {
    return { ok: false as const, error: "Салонът е затворен на тази дата." };
  }
  if (await hasTimeOffConflict(resource.id, start, end)) {
    return { ok: false as const, error: "Имаш отпуск/почивка в този период. Избери друг час." };
  }

  // Паралелен час: симетрична проверка — намазването да не се блъска с чуждо и да
  // пада в нечий престой (важи и за по-ранен час преди записан host).
  if (d.allowParallel && !(await fitsParallelSlot(resource.id, start, end, activeMin > 0 ? activeMin : durationMin, processingMin))) {
    return { ok: false as const, error: "Този паралелен час не се събира в свободния престой." };
  }

  // upsert клиент по телефон (схемата изисква phone min(5) → не може да е null)
  const clientId = (await upsertClientByPhone(d.clientName, d.clientPhone)) ?? "";

  try {
    const id = nanoid();
    await db.insert(schema.bookings).values({
      id,
      resourceId: resource.id,
      serviceItemId: d.serviceItemId,
      serviceName: d.serviceName,
      clientId,
      startAt: start,
      endAt: end,
      status: "confirmed",
      activeMin,
      processingMin,
      allowParallel: d.allowParallel === true,
      source: "phone",
      priceEur,
      notes: d.notes ?? null,
      createdBy: session.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    revalidatePath("/staff");
    revalidatePath("/admin/bookings");
    return { ok: true as const, id };
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e?.code === "23P01" || (e?.message ?? "").includes("bookings_no_overlap")) {
      return { ok: false as const, error: "Този час вече е зает. Избери друг." };
    }
    throw err;
  }
}

/**
 * Изпълнителят премества свой час (reschedule) за нов начален момент. Запазва
 * продължителността на стария час; проверява time-off конфликт и хваща EXCLUDE
 * constraint-а (друг зает час) през 23P01.
 */
export async function rescheduleMyBooking(id: string, newStartISO: string) {
  const { resource } = await requireStaff();

  const booking = await db.query.bookings.findFirst({
    where: (b, { and, eq }) => and(eq(b.id, id), eq(b.resourceId, resource.id)),
  });
  if (!booking) {
    return { ok: false as const, error: "Часът не е намерен или не е твой." };
  }
  if (booking.status === "cancelled" || booking.status === "no_show") {
    return { ok: false as const, error: "Този час не може да се мести." };
  }

  const newStart = new Date(newStartISO);
  if (Number.isNaN(newStart.getTime())) {
    return { ok: false as const, error: "Невалиден час." };
  }
  if (await isClosed(sofiaDateStr(newStart))) {
    return { ok: false as const, error: "Салонът е затворен на тази дата." };
  }
  const durationMs = booking.endAt.getTime() - booking.startAt.getTime();
  const newEnd = new Date(newStart.getTime() + durationMs);

  if (await hasTimeOffConflict(resource.id, newStart, newEnd)) {
    return { ok: false as const, error: "Имаш отпуск/почивка в този период. Избери друг час." };
  }
  // Паралелен час: при местене пак трябва да се вписва симетрично сред съседите
  // (constraint-ът не го пази, защото allow_parallel го изключва).
  const effActive = booking.activeMin > 0 ? booking.activeMin : Math.round(durationMs / 60000);
  if (booking.allowParallel && !(await fitsParallelSlot(resource.id, newStart, newEnd, effActive, booking.processingMin, id))) {
    return { ok: false as const, error: "Паралелният час не се събира в свободен престой на това време." };
  }

  try {
    await db
      .update(schema.bookings)
      .set({ startAt: newStart, endAt: newEnd, updatedAt: new Date() })
      .where(and(eq(schema.bookings.id, id), eq(schema.bookings.resourceId, resource.id)));
    revalidatePath("/staff/board");
    revalidatePath("/staff");
    revalidatePath("/admin/bookings");
    return { ok: true as const };
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e?.code === "23P01" || (e?.message ?? "").includes("bookings_no_overlap")) {
      return { ok: false as const, error: "Този час вече е зает. Избери друг." };
    }
    throw err;
  }
}

const editSchema = z.object({
  serviceItemId: z.string().nullable().optional(),
  serviceName: z.string().min(1),
  clientName: z.string().optional(),
  clientPhone: z.string().optional(),
  dateStr: z.string(), // YYYY-MM-DD Sofia wall
  timeStr: z.string(), // HH:MM Sofia wall
  durationMin: z.coerce.number().int().min(5).max(600),
  activeMin: z.coerce.number().int().min(0).max(600).optional(),
  processingMin: z.coerce.number().int().min(0).max(600).optional(),
  notes: z.string().nullable().optional(),
});

/**
 * Изпълнителят редактира свой час: услуга, клиент, начало/продължителност, бележки.
 * Запазва own-resource guard-а (намира и обновява само свой запис); проверява
 * time-off конфликт и хваща EXCLUDE constraint-а (зает час) през 23P01.
 */
export async function editMyBooking(id: string, input: z.infer<typeof editSchema>) {
  const { resource } = await requireStaff();
  const d = editSchema.parse(input);
  const booking = await db.query.bookings.findFirst({
    where: (b, { and, eq }) => and(eq(b.id, id), eq(b.resourceId, resource.id)),
  });
  if (!booking) return { ok: false as const, error: "Часът не е намерен или не е твой." };
  if (await isClosed(d.dateStr)) return { ok: false as const, error: "Салонът е затворен на тази дата." };
  const start = sofiaWallToUtc(d.dateStr, d.timeStr);
  const end = new Date(start.getTime() + d.durationMin * 60000);
  if (await hasTimeOffConflict(resource.id, start, end)) {
    return { ok: false as const, error: "Имаш отпуск/почивка в този период." };
  }
  const activeMinE = d.activeMin ?? booking.activeMin;
  const procMinE = d.processingMin ?? booking.processingMin;
  if (booking.allowParallel && !(await fitsParallelSlot(resource.id, start, end, activeMinE > 0 ? activeMinE : d.durationMin, procMinE, id))) {
    return { ok: false as const, error: "Паралелният час не се събира в свободен престой на това време." };
  }
  const clientId = await upsertClientByPhone(d.clientName, d.clientPhone);
  const priceEur = d.serviceItemId ? (await ownOffering(resource.id, d.serviceItemId)).priceEur : booking.priceEur;
  try {
    await db
      .update(schema.bookings)
      .set({
        serviceItemId: d.serviceItemId ?? null,
        serviceName: d.serviceName,
        clientId: clientId ?? booking.clientId,
        startAt: start,
        endAt: end,
        priceEur,
        activeMin: d.activeMin ?? booking.activeMin,
        processingMin: d.processingMin ?? booking.processingMin,
        notes: d.notes ?? null,
        updatedAt: new Date(),
      })
      .where(and(eq(schema.bookings.id, id), eq(schema.bookings.resourceId, resource.id)));
    revalidatePath("/staff");
    revalidatePath("/staff/board");
    revalidatePath("/admin/bookings");
    return { ok: true as const };
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e?.code === "23P01" || (e?.message ?? "").includes("bookings_no_overlap")) {
      return { ok: false as const, error: "Застъпва друг час. Избери друго време." };
    }
    throw err;
  }
}

/** Изпълнителят отменя свой час. */
export async function cancelMyBooking(id: string) {
  const { resource } = await requireStaff();
  await db
    .update(schema.bookings)
    .set({ status: "cancelled", cancelledAt: new Date(), updatedAt: new Date() })
    .where(and(eq(schema.bookings.id, id), eq(schema.bookings.resourceId, resource.id)));
  revalidatePath("/staff");
  revalidatePath("/admin/bookings");
  return { ok: true as const };
}

/** Изпълнителят отбелязва, че клиентът е дошъл. */
export async function markMyArrived(id: string) {
  const { resource } = await requireStaff();
  await db
    .update(schema.bookings)
    .set({ status: "arrived", arrivedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(schema.bookings.id, id), eq(schema.bookings.resourceId, resource.id)));
  revalidatePath("/staff");
  revalidatePath("/admin/bookings");
  return { ok: true as const };
}

/** Изпълнителят приключва свой час. */
export async function markMyCompleted(id: string) {
  const { resource } = await requireStaff();
  await db
    .update(schema.bookings)
    .set({ status: "completed", completedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(schema.bookings.id, id), eq(schema.bookings.resourceId, resource.id)));
  revalidatePath("/staff");
  revalidatePath("/admin/bookings");
  return { ok: true as const };
}

/** Изпълнителят отбелязва неявяване на клиента. */
export async function markMyNoShow(id: string) {
  const { resource } = await requireStaff();
  await db
    .update(schema.bookings)
    .set({ status: "no_show", updatedAt: new Date() })
    .where(and(eq(schema.bookings.id, id), eq(schema.bookings.resourceId, resource.id)));
  revalidatePath("/staff");
  revalidatePath("/admin/bookings");
  return { ok: true as const };
}

// Оборотът на изпълнителя живее в @/lib/actions/revenue (getMyRevenue) — модел
// „Изкарано + Очаквано", не зависи от ръчно маркиране на часовете.
