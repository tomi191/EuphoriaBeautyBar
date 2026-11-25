"use server";

import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { notifyResource, notifyAdmin } from "@/lib/notify";
import { formatWhen } from "@/lib/email/booking";
import { sofiaDateStr } from "@/lib/booking/time";
import { allowedFrom, isLateCancel } from "@/lib/booking/status";

/**
 * Отказ на час от клиента по линка от имейла (token = booking id, негадаем
 * nanoid). Без auth. Уведомява изпълнителя и управлението. Не позволява отказ на
 * минал или вече отказан час. Статусът се сменя атомарно по правилата в status.ts.
 */
export async function cancelOwnBooking(id: string) {
  const booking = await db.query.bookings.findFirst({ where: (b, { eq }) => eq(b.id, id) });
  if (!booking) return { ok: false as const, error: "Часът не е намерен." };
  if (booking.status === "cancelled") return { ok: true as const, late: false };
  if (booking.startAt.getTime() < Date.now()) {
    return { ok: false as const, error: "Този час вече е минал и не може да се откаже онлайн." };
  }
  const late = isLateCancel(booking.startAt);
  const rows = await db
    .update(schema.bookings)
    .set({
      status: "cancelled",
      cancelledAt: new Date(),
      cancelReason: late ? "късен отказ от клиента (под 5 часа)" : "отказан от клиента онлайн",
      updatedAt: new Date(),
    })
    .where(and(eq(schema.bookings.id, id), inArray(schema.bookings.status, allowedFrom("cancelled"))))
    .returning({ id: schema.bookings.id });
  if (rows.length === 0) {
    // Някой друг го е отказал междувременно: успех без второ известие; иначе статусът не позволява отказ.
    const now = await db.query.bookings.findFirst({ where: (b, { eq }) => eq(b.id, id), columns: { status: true } });
    return now?.status === "cancelled"
      ? { ok: true as const, late: false }
      : { ok: false as const, error: "Не успяхме да откажем часа." };
  }
  // Извести изпълнителя + админ канала, че клиентът се е отказал.
  const performer = await db.query.resources.findFirst({
    where: (r, { eq: e }) => e(r.id, booking.resourceId),
    columns: { name: true },
  });
  const title = late ? "Късен отказ, под 5 часа" : "Отказан онлайн";
  const body = late
    ? `${booking.serviceName}, ${formatWhen(booking.startAt)}. Може да се начисли 50% при следващо посещение.`
    : `${booking.serviceName}, ${formatWhen(booking.startAt)}. Мястото е свободно.`;
  await Promise.allSettled([
    notifyResource(booking.resourceId, { title, body, url: "/staff" }),
    notifyAdmin({
      title,
      body,
      performerName: performer?.name,
      dateKey: sofiaDateStr(booking.startAt),
    }),
  ]);
  return { ok: true as const, late };
}
