"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { requireAdmin } from "@/lib/actions/auth-guard";
import { getDaySlots, hasTimeOffConflict, type DaySlot } from "@/lib/booking/slots";
import { fitsParallelWindow } from "@/lib/booking/parallel";
import { formatServicePrice } from "@/lib/booking/price";
import { sofiaWallToUtc } from "@/lib/booking/time";
import { upsertClientByPhone } from "@/lib/booking/clients";
import { sendBookingConfirmation, formatWhen } from "@/lib/email/booking";
import { sendPushToResource } from "@/lib/push";

export interface DayScheduleResult {
  open: string | null;
  close: string | null;
  slots: DaySlot[];
}

/** Дневен график за услуга/ресурс/дата (за формата за записване). Admin няма мин. предизвестие. */
export async function fetchSlots(resourceId: string, serviceItemId: string, dateStr: string): Promise<DayScheduleResult> {
  await requireAdmin();
  const item = await db.query.serviceItems.findFirst({ where: (s, { eq }) => eq(s.id, serviceItemId) });
  if (!item) return { open: null, close: null, slots: [] };
  const res = await getDaySlots({
    resourceId,
    durationMin: item.durationMin,
    bufferMin: item.bufferMin,
    dateStr,
    minNoticeMin: 0,
  });
  if (!res) return { open: null, close: null, slots: [] };
  return res;
}

const bookingSchema = z.object({
  resourceId: z.string().min(1),
  serviceItemId: z.string().nullable().optional(),
  serviceName: z.string().min(1),
  durationMin: z.number().int().positive(),
  bufferMin: z.number().int().min(0).default(0),
  startAt: z.string(), // ISO UTC
  clientName: z.string().min(2),
  clientPhone: z.string().min(5),
  clientEmail: z.string().email().nullable().optional(),
  notes: z.string().nullable().optional(),
  source: z.enum(["online", "phone", "walkin"]).default("phone"),
  allowParallel: z.boolean().optional(),
});

export type BookingInput = z.infer<typeof bookingSchema>;

function revalidate() {
  revalidatePath("/admin/bookings");
}

export async function createBooking(input: BookingInput) {
  const session = await requireAdmin();
  const data = bookingSchema.parse(input);
  const start = new Date(data.startAt);
  const end = new Date(start.getTime() + (data.durationMin + data.bufferMin) * 60000);

  if (await hasTimeOffConflict(data.resourceId, start, end)) {
    return { ok: false as const, error: "Изпълнителят е в отпуск/почивка в този период." };
  }

  // Паралелен час: трябва да се събира в свободен престой на чужд (хост) запис.
  if (data.allowParallel && !(await fitsParallelWindow(data.resourceId, start, end))) {
    return { ok: false as const, error: "Този паралелен час не се събира в свободния престой." };
  }

  // upsert клиент (по имейл, иначе по телефон)
  let clientId: string;
  const existing = data.clientEmail
    ? await db.query.clients.findFirst({ where: (c, { eq }) => eq(c.email, data.clientEmail as string) })
    : await db.query.clients.findFirst({ where: (c, { eq }) => eq(c.phone, data.clientPhone) });
  if (existing) {
    clientId = existing.id;
  } else {
    clientId = nanoid();
    await db.insert(schema.clients).values({
      id: clientId,
      name: data.clientName,
      email: data.clientEmail ?? null,
      phone: data.clientPhone,
      createdAt: new Date(),
    });
  }

  // Каталожна услуга (ако е посочена) - за снимка на цената (€) и за имейла.
  const item = data.serviceItemId
    ? await db.query.serviceItems.findFirst({ where: (s, { eq }) => eq(s.id, data.serviceItemId as string) })
    : undefined;

  try {
    const id = nanoid();
    await db.insert(schema.bookings).values({
      id,
      resourceId: data.resourceId,
      serviceItemId: data.serviceItemId ?? null,
      serviceName: data.serviceName,
      clientId,
      startAt: start,
      endAt: end,
      status: "confirmed",
      activeMin: item?.activeMin ?? 0,
      processingMin: item?.processingMin ?? 0,
      allowParallel: data.allowParallel === true,
      source: data.source,
      priceEur: item?.price ?? null,
      notes: data.notes ?? null,
      createdBy: session.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    revalidate();

    // Известие до изпълнителя, че ресепцията му е добавила час — досега push идваше
    // САМО при онлайн запис (public-booking), затова ръчно въведените от админ часове
    // не уведомяваха никого. await-нато (serverless не убива функцията преди push да
    // тръгне); .catch — доставка не блокира записа.
    await sendPushToResource(data.resourceId, {
      title: "Нов запис",
      body: `${data.serviceName} — ${formatWhen(start)} (${data.clientName})`,
      url: "/staff",
    }).catch(() => {});

    // Потвърждение към клиента, ако е оставил имейл (не блокира записа).
    if (data.clientEmail) {
      const resource = await db.query.resources.findFirst({ where: (r, { eq }) => eq(r.id, data.resourceId) });
      await sendBookingConfirmation(data.clientEmail, {
        clientName: data.clientName,
        serviceName: data.serviceName,
        performerName: resource?.name ?? "екипа на Euphoria",
        start,
        priceLabel: item ? formatServicePrice(item) : undefined,
      }).catch(() => {});
    }
    return { ok: true as const, id };
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e?.code === "23P01" || (e?.message ?? "").includes("bookings_no_overlap")) {
      return { ok: false as const, error: "Този час вече е зает. Избери друг слот." };
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
 * Admin редактира час: услуга, клиент, начало/продължителност, бележки. Запазва
 * resourceId-а на записа (без смяна на изпълнител); проверява time-off конфликт и
 * хваща EXCLUDE constraint-а (зает час) през 23P01.
 */
export async function updateBooking(id: string, input: z.infer<typeof editSchema>) {
  await requireAdmin();
  const d = editSchema.parse(input);
  const booking = await db.query.bookings.findFirst({ where: (b, { eq }) => eq(b.id, id) });
  if (!booking) return { ok: false as const, error: "Часът не е намерен." };
  const start = sofiaWallToUtc(d.dateStr, d.timeStr);
  const end = new Date(start.getTime() + d.durationMin * 60000);
  if (await hasTimeOffConflict(booking.resourceId, start, end)) {
    return { ok: false as const, error: "Изпълнителят е в отпуск/почивка в този период." };
  }
  // Паралелен час: при местене пак трябва да се събира в свободен престой-прозорец.
  if (booking.allowParallel && !(await fitsParallelWindow(booking.resourceId, start, end, id))) {
    return { ok: false as const, error: "Паралелният час не се събира в свободен престой на това време." };
  }
  const clientId = await upsertClientByPhone(d.clientName, d.clientPhone);
  const item = d.serviceItemId
    ? await db.query.serviceItems.findFirst({ where: (s, { eq }) => eq(s.id, d.serviceItemId as string) })
    : undefined;
  const priceEur = d.serviceItemId ? item?.price ?? null : booking.priceEur;
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
      .where(eq(schema.bookings.id, id));
    revalidatePath("/admin/bookings");
    revalidatePath("/staff");
    return { ok: true as const };
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e?.code === "23P01" || (e?.message ?? "").includes("bookings_no_overlap")) {
      return { ok: false as const, error: "Този час вече е зает. Избери друг слот." };
    }
    throw err;
  }
}

export async function markArrived(id: string) {
  await requireAdmin();
  await db
    .update(schema.bookings)
    .set({ status: "arrived", arrivedAt: new Date(), updatedAt: new Date() })
    .where(eq(schema.bookings.id, id));
  revalidate();
}

export async function markCompleted(id: string) {
  await requireAdmin();
  await db
    .update(schema.bookings)
    .set({ status: "completed", completedAt: new Date(), updatedAt: new Date() })
    .where(eq(schema.bookings.id, id));
  revalidate();
}

export async function cancelBooking(id: string, reason?: string) {
  await requireAdmin();
  await db
    .update(schema.bookings)
    .set({ status: "cancelled", cancelledAt: new Date(), cancelReason: reason ?? null, updatedAt: new Date() })
    .where(eq(schema.bookings.id, id));
  revalidate();
}
