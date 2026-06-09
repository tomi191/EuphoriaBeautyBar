"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { requireStaff } from "@/lib/actions/auth-guard";
import { getDaySlots, hasTimeOffConflict, type DaySlot } from "@/lib/booking/slots";

export interface DayScheduleResult {
  open: string | null;
  close: string | null;
  slots: DaySlot[];
}

/** Собствена продължителност на изпълнителя за услуга (resource_services) или каталожна. */
async function ownDuration(resourceId: string, serviceItemId: string) {
  const [rs, item] = await Promise.all([
    db.query.resourceServices.findFirst({
      where: (r, { and, eq }) => and(eq(r.resourceId, resourceId), eq(r.serviceItemId, serviceItemId)),
    }),
    db.query.serviceItems.findFirst({ where: (s, { eq }) => eq(s.id, serviceItemId) }),
  ]);
  return {
    durationMin: rs?.durationMin ?? item?.durationMin ?? 30,
    bufferMin: rs?.bufferMin ?? item?.bufferMin ?? 10,
  };
}

/** Дневен график за собствения изпълнител (без мин. предизвестие — ръчно записване). */
export async function fetchMySlots(serviceItemId: string, dateStr: string): Promise<DayScheduleResult> {
  const { resource } = await requireStaff();
  const { durationMin, bufferMin } = await ownDuration(resource.id, serviceItemId);
  const res = await getDaySlots({ resourceId: resource.id, durationMin, bufferMin, dateStr, minNoticeMin: 0 });
  return res ?? { open: null, close: null, slots: [] };
}

const bookingSchema = z.object({
  serviceItemId: z.string().min(1),
  serviceName: z.string().min(1),
  startAt: z.string(),
  clientName: z.string().min(2),
  clientPhone: z.string().min(5),
  notes: z.string().nullable().optional(),
});

/** Изпълнителят записва ръчно час (телефонен клиент) за себе си. */
export async function createMyBooking(input: z.infer<typeof bookingSchema>) {
  const { session, resource } = await requireStaff();
  const d = bookingSchema.parse(input);
  const { durationMin, bufferMin } = await ownDuration(resource.id, d.serviceItemId);
  const start = new Date(d.startAt);
  const end = new Date(start.getTime() + (durationMin + bufferMin) * 60000);

  if (await hasTimeOffConflict(resource.id, start, end)) {
    return { ok: false as const, error: "Имаш отпуск/почивка в този период. Избери друг час." };
  }

  // upsert клиент по телефон
  let clientId: string;
  const existing = await db.query.clients.findFirst({ where: (c, { eq }) => eq(c.phone, d.clientPhone) });
  if (existing) {
    clientId = existing.id;
  } else {
    clientId = nanoid();
    await db.insert(schema.clients).values({ id: clientId, name: d.clientName, phone: d.clientPhone, createdAt: new Date() });
  }

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
      source: "phone",
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
