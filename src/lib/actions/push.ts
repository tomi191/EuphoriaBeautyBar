"use server";

import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, schema } from "@/lib/db";
import { requireStaff } from "@/lib/actions/auth-guard";

/** Записва (или обновява) push абонамента на устройството за текущия изпълнител. */
export async function subscribeStaffPush(sub: { endpoint: string; p256dh: string; auth: string }) {
  const { resource } = await requireStaff();
  const existing = await db.query.pushSubscriptions.findFirst({
    where: (s, { eq }) => eq(s.endpoint, sub.endpoint),
  });
  if (existing) {
    await db
      .update(schema.pushSubscriptions)
      .set({ resourceId: resource.id, p256dh: sub.p256dh, auth: sub.auth })
      .where(eq(schema.pushSubscriptions.id, existing.id));
  } else {
    await db.insert(schema.pushSubscriptions).values({
      id: nanoid(),
      resourceId: resource.id,
      endpoint: sub.endpoint,
      p256dh: sub.p256dh,
      auth: sub.auth,
      createdAt: new Date(),
    });
  }
  return { ok: true as const };
}

/** Премахва абонамента (изключване на известия). */
export async function unsubscribeStaffPush(endpoint: string) {
  const { resource } = await requireStaff();
  const existing = await db.query.pushSubscriptions.findFirst({
    where: (s, { eq }) => eq(s.endpoint, endpoint),
  });
  // Ownership: само собственикът (или legacy запис без resourceId) може да отпише този
  // endpoint — иначе друг изпълнител би могъл да заглуши известията на колега.
  if (existing && existing.resourceId && existing.resourceId !== resource.id) {
    return { ok: false as const };
  }
  await db.delete(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.endpoint, endpoint));
  return { ok: true as const };
}
