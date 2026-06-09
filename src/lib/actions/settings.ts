"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireAdmin } from "@/lib/actions/auth-guard";

export async function getSetting<T = unknown>(key: string): Promise<T | null> {
  const row = await db.query.siteSettings.findFirst({ where: (s, { eq }) => eq(s.key, key) });
  return (row?.value as T) ?? null;
}

export async function setSetting(key: string, value: unknown) {
  await requireAdmin();
  const exists = await db.query.siteSettings.findFirst({ where: (s, { eq }) => eq(s.key, key) });
  if (exists) {
    await db
      .update(schema.siteSettings)
      .set({ value, updatedAt: new Date() })
      .where(eq(schema.siteSettings.key, key));
  } else {
    await db.insert(schema.siteSettings).values({ key, value, updatedAt: new Date() });
  }
  revalidatePath("/admin/settings");
  revalidatePath("/");
}
