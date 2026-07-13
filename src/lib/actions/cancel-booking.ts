"use server";

import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { notifyResource, notifyAdmin } from "@/lib/notify";
import { formatWhen } from "@/lib/email/booking";
import { sofiaDateStr } from "@/lib/booking/time";

/**
 * Отмяна на час от клиента по линка от имейла (token = booking id, негадаем
 * nanoid). Без auth. Уведомява изпълнителя (push). Не позволява отмяна на минал
 * или вече отменен час.
 */
export async function cancelOwnBooking(id: string) {
  const booking = await db.query.bookings.findFirst({ where: (b, { eq }) => eq(b.id, id) });
  if (!booking) return { ok: false as const, error: "Часът не е намерен." };
  if (booking.status === "cancelled") return { ok: true as const };
  if (booking.startAt.getTime() < Date.now()) {
    return { ok: false as const, error: "Този час вече е минал и не може да се отмени онлайн." };
  }
  await db
    .update(schema.bookings)
    .set({ status: "cancelled", cancelledAt: new Date(), cancelReason: "отменен от клиента", updatedAt: new Date() })
    .where(eq(schema.bookings.id, id));
  // Извести изпълнителя + админ канала, че клиентът се е отказал.
  const performer = await db.query.resources.findFirst({
    where: (r, { eq: e }) => e(r.id, booking.resourceId),
    columns: { name: true },
  });
  await Promise.allSettled([
    notifyResource(booking.resourceId, {
      title: "Отменен час (от клиента)",
      body: `${booking.serviceName} — ${formatWhen(booking.startAt)}`,
      url: "/staff",
    }),
    notifyAdmin({
      title: "Отменен час (от клиента)",
      body: `${booking.serviceName} — ${formatWhen(booking.startAt)}`,
      performerName: performer?.name,
      dateKey: sofiaDateStr(booking.startAt),
    }),
  ]);
  return { ok: true as const };
}
