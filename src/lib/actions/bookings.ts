"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { requireAdmin } from "@/lib/actions/auth-guard";
import { getDaySlots, hasTimeOffConflict, hasActiveConflict, type DaySlot } from "@/lib/booking/slots";
import { fitsParallelSlot } from "@/lib/booking/parallel";
import { formatServicePrice } from "@/lib/booking/price";
import { resolveOffering } from "@/lib/booking/offering";
import { allowedFrom, TRANSITION_ERROR } from "@/lib/booking/status";
import { sofiaWallToUtc, sofiaDateStr } from "@/lib/booking/time";
import { isClosed } from "@/lib/booking/closures";
import { upsertClientByPhone } from "@/lib/booking/clients";
import { sendBookingConfirmation, formatWhen } from "@/lib/email/booking";
import { notifyResource } from "@/lib/notify";
import { siteConfig } from "@/lib/site";

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
  // Време/буфер на изпълнителя (resource_services > каталог) като публичния път, не каталожните.
  const offering = await resolveOffering(resourceId, serviceItemId);
  const res = await getDaySlots({
    resourceId,
    durationMin: offering.durationMin,
    bufferMin: offering.bufferMin,
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
  // durationMin/bufferMin/цена НЕ идват от клиента: резолват се server-side (resolveOffering).
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
  // Офертата (собствена цена/време на изпълнителя) е единственият източник за блока, оборота и паралела.
  const offering = data.serviceItemId ? await resolveOffering(data.resourceId, data.serviceItemId) : null;
  if (!offering) return { ok: false as const, error: "Избери услуга от ценоразписа." };
  const end = new Date(start.getTime() + (offering.durationMin + offering.bufferMin) * 60000);

  if (await isClosed(sofiaDateStr(start))) {
    return { ok: false as const, error: "Салонът е затворен на тази дата." };
  }
  if (await hasTimeOffConflict(data.resourceId, start, end)) {
    return { ok: false as const, error: "Изпълнителят е в отпуск/почивка в този период." };
  }

  const effActive = offering.activeMin > 0 ? offering.activeMin : offering.durationMin;

  // Паралелен час: симетрична проверка (както staff и графика) — не еднопосочния
  // fitsParallelWindow, който отхвърляше reverse-паралели.
  if (data.allowParallel && !(await fitsParallelSlot(data.resourceId, start, end, effActive, offering.processingMin))) {
    return { ok: false as const, error: "Този паралелен час не се събира в свободния престой." };
  }
  // Непаралелен час: провери застъпване и с паралелни редове (частичният EXCLUDE не ги пази).
  if (!data.allowParallel && (await hasActiveConflict(data.resourceId, start, end))) {
    return { ok: false as const, error: "Този час се застъпва с друг запис. Избери друг слот." };
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

  // Каталожна услуга (ако е посочена) - само за имейла (цената/времето идват от offering).
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
      activeMin: offering.activeMin,
      processingMin: offering.processingMin,
      allowParallel: data.allowParallel === true,
      source: data.source,
      priceEur: offering.priceEur,
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
    await notifyResource(data.resourceId, {
      title: "Нов запис",
      body: `${data.serviceName} — ${formatWhen(start)} (${data.clientName})`,
      url: "/staff",
      clientPhone: data.clientPhone,
      dateKey: sofiaDateStr(start),
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
        cancelUrl: `${siteConfig.url}/otkazhi-chas/${id}`,
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
  // ЦЕЛИЯТ блок в минути = продължителност + буфер (формата се пред-попълва с endAt-startAt;
  // bookings няма отделна колона за буфер). Не се добавя втори буфер отгоре.
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
  if (await isClosed(d.dateStr)) return { ok: false as const, error: "Салонът е затворен на тази дата." };
  const start = sofiaWallToUtc(d.dateStr, d.timeStr);
  // durationMin е целият блок (виж editSchema) - буферът е вече в него, не се губи.
  const end = new Date(start.getTime() + d.durationMin * 60000);
  if (await hasTimeOffConflict(booking.resourceId, start, end)) {
    return { ok: false as const, error: "Изпълнителят е в отпуск/почивка в този период." };
  }
  // Паралелен час: симетрична проверка (както staff/графика) → admin може да
  // редактира и reverse-паралели (по-ранния от двойката), не само forward.
  // При смяна на услугата активно/престой идват от новата услуга (иначе остават от старата).
  const serviceChanged = (d.serviceItemId ?? null) !== (booking.serviceItemId ?? null);
  const newOffering = serviceChanged && d.serviceItemId ? await resolveOffering(booking.resourceId, d.serviceItemId) : null;
  const activeMinU = serviceChanged ? (newOffering?.activeMin ?? 0) : (d.activeMin ?? booking.activeMin);
  const procMinU = serviceChanged ? (newOffering?.processingMin ?? 0) : (d.processingMin ?? booking.processingMin);
  if (booking.allowParallel && !(await fitsParallelSlot(booking.resourceId, start, end, activeMinU > 0 ? activeMinU : d.durationMin, procMinU, id))) {
    return { ok: false as const, error: "Паралелният час не се събира в свободен престой на това време." };
  }
  if (!booking.allowParallel && (await hasActiveConflict(booking.resourceId, start, end, id))) {
    return { ok: false as const, error: "Този час се застъпва с друг запис на това време." };
  }
  const clientId = await upsertClientByPhone(d.clientName, d.clientPhone);
  // priceEur е СНИМКА към момента на записване — не го пипаме при редакция на време/бележка.
  // Пре-снимаме (по собствената цена) само ако услугата реално е сменена.
  const priceEur = serviceChanged ? (newOffering?.priceEur ?? null) : booking.priceEur;
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
        activeMin: activeMinU,
        processingMin: procMinU,
        notes: d.notes ?? null,
        updatedAt: new Date(),
      })
      .where(eq(schema.bookings.id, id));
    revalidatePath("/admin/bookings");
    revalidatePath("/staff");
    // Известие до изпълнителя — ресепцията промени негов час (час/услуга/време).
    await notifyResource(booking.resourceId, {
      title: "Променен час",
      body: `${d.serviceName} — ${formatWhen(start)}${d.clientName ? ` (${d.clientName})` : ""}`,
      url: "/staff",
      clientPhone: d.clientPhone,
      dateKey: sofiaDateStr(start),
    }).catch(() => {});
    return { ok: true as const };
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e?.code === "23P01" || (e?.message ?? "").includes("bookings_no_overlap")) {
      return { ok: false as const, error: "Този час вече е зает. Избери друг слот." };
    }
    throw err;
  }
}

/**
 * Атомарен преход на статус: UPDATE ... WHERE status IN (позволени) с returning.
 * 0 реда (липсващ id или недопустим преход, напр. отменен -> приключен) -> ok:false.
 */
async function transition(
  id: string,
  to: "arrived" | "completed" | "cancelled",
  extra: Record<string, Date | string | null>,
) {
  const rows = await db
    .update(schema.bookings)
    .set({ status: to, ...extra, updatedAt: new Date() })
    .where(and(eq(schema.bookings.id, id), inArray(schema.bookings.status, allowedFrom(to))))
    .returning({ id: schema.bookings.id });
  if (rows.length === 0) return { ok: false as const, error: TRANSITION_ERROR };
  revalidate();
  revalidatePath("/staff");
  revalidatePath("/staff/board");
  return { ok: true as const };
}

/**
 * markArrived/markCompleted/cancelBooking се викат от booking-row-actions.tsx, който
 * показва причината при ok:false. Недопустим преход се връща като стойност, не като
 * throw - server action грешките се маскират на клиента като общо „Грешка".
 */
export async function markArrived(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const res = await transition(id, "arrived", { arrivedAt: new Date() });
  return res.ok ? { ok: true } : { ok: false, error: res.error };
}

export async function markCompleted(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const res = await transition(id, "completed", { completedAt: new Date() });
  return res.ok ? { ok: true } : { ok: false, error: res.error };
}

export async function cancelBooking(id: string, reason?: string): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const booking = await db.query.bookings.findFirst({ where: (b, { eq }) => eq(b.id, id) });
  const res = await transition(id, "cancelled", { cancelledAt: new Date(), cancelReason: reason ?? null });
  if (!res.ok) return { ok: false, error: res.error };
  // Известие до изпълнителя - ресепцията отмени негов час.
  if (booking) {
    await notifyResource(booking.resourceId, {
      title: "Отменен час",
      body: `${booking.serviceName} — ${formatWhen(booking.startAt)}`,
      url: "/staff",
      dateKey: sofiaDateStr(booking.startAt),
    }).catch(() => {});
  }
  return { ok: true };
}
