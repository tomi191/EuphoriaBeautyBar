"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireAdmin } from "@/lib/actions/auth-guard";

/** Тагва (или разтагва) снимка от галерията към изпълнител — захранва портфолиото при записване. */
export async function setGalleryImageResource(imageId: string, resourceId: string | null) {
  await requireAdmin();
  await db
    .update(schema.galleryImages)
    .set({ resourceId: resourceId || null })
    .where(eq(schema.galleryImages.id, imageId));
  revalidatePath("/admin/gallery");
  revalidatePath("/zapazi-chas");
}
