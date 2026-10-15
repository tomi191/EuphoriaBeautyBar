"use server";

import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireAdmin } from "@/lib/actions/auth-guard";
import { loadAdminNotifications, SEEN_KEY, type AdminNotificationsState } from "@/lib/admin/notifications";

export async function getAdminNotifications(): Promise<AdminNotificationsState> {
  await requireAdmin();
  return loadAdminNotifications();
}

export async function markAdminNotificationsSeen(): Promise<{ ok: true; at: string }> {
  await requireAdmin();
  const at = new Date().toISOString();
  const exists = await db.query.siteSettings.findFirst({ where: (s, { eq }) => eq(s.key, SEEN_KEY) });
  if (exists) {
    await db
      .update(schema.siteSettings)
      .set({ value: { at }, updatedAt: new Date() })
      .where(eq(schema.siteSettings.key, SEEN_KEY));
  } else {
    await db.insert(schema.siteSettings).values({ key: SEEN_KEY, value: { at }, updatedAt: new Date() });
  }
  return { ok: true, at };
}
