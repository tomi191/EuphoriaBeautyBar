"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { requireAdmin } from "@/lib/actions/auth-guard";
import { getDaySlots, hasTimeOffConflict, type DaySlot } from "@/lib/booking/slots";
import { formatServicePrice } from "@/lib/booking/price";
import { sendBookingConfirmation } from "@/lib/email/booking";

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
      source: data.source,
      priceEur: item?.price ?? null,
      notes: data.notes ?? null,
      createdBy: session.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    revalidate();

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
