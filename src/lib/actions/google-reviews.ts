"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { fetchPlaceReviews } from "@/lib/google-business";
import { requireAdmin } from "@/lib/actions/auth-guard";

export async function syncGoogleReviews() {
  await requireAdmin();
  const summary = await fetchPlaceReviews();
  if (!summary) return { ok: false, reason: "missing-credentials" as const };

  await db.delete(schema.googleReviews);
  for (const r of summary.reviews) {
    await db.insert(schema.googleReviews).values({
      id: `${r.authorName}-${r.publishedAt.getTime()}`,
      authorName: r.authorName,
      authorPhoto: r.authorPhoto ?? null,
      rating: r.rating,
      text: r.text,
      language: r.language ?? null,
      publishedAt: r.publishedAt,
      fetchedAt: new Date(),
    });
  }

  revalidatePath("/admin/reviews");
  revalidatePath("/");
  return { ok: true as const, count: summary.reviews.length, rating: summary.rating, total: summary.totalReviews };
}

export async function deleteGoogleReview(id: string) {
  await requireAdmin();
  await db.delete(schema.googleReviews).where(eq(schema.googleReviews.id, id));
  revalidatePath("/admin/reviews");
  revalidatePath("/");
}
