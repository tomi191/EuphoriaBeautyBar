"use server";

import { revalidatePath } from "next/cache";
import { eq, notLike } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { fetchPlaceReviews } from "@/lib/google-business";
import { deleteConnection, fetchGbpReviews } from "@/lib/google-oauth";
import { requireAdmin } from "@/lib/actions/auth-guard";

export async function syncGoogleReviews() {
  await requireAdmin();
  // Приоритет: Business Profile OAuth (всички отзиви, безплатно) →
  // Places API ключ (5 отзива) → грешка.
  const summary = (await fetchGbpReviews()) ?? (await fetchPlaceReviews());
  if (!summary) return { ok: false, reason: "missing-credentials" as const };

  // Ръчно добавените отзиви (id "manual-…") оцеляват при API sync.
  await db.delete(schema.googleReviews).where(notLike(schema.googleReviews.id, "manual-%"));
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

/** Разкачва Google Business Profile връзката (изтрива записания refresh token). */
export async function disconnectGoogleBusiness() {
  await requireAdmin();
  await deleteConnection();
  revalidatePath("/admin/reviews");
}

const manualReviewSchema = z.object({
  authorName: z.string().trim().min(2, "Името е твърде кратко").max(80),
  rating: z.coerce.number().int().min(1).max(5),
  text: z.string().trim().min(10, "Текстът е твърде кратък").max(2000),
  publishedAt: z.coerce.date(),
});

/**
 * Безплатен път без Google Cloud: салонът копира отзив от Google профила си
 * (име, звезди, текст, дата) и го въвежда ръчно. Влиза в същата таблица,
 * която публичната секция чете.
 */
export async function addGoogleReview(input: {
  authorName: string;
  rating: number;
  text: string;
  publishedAt: string;
}) {
  await requireAdmin();
  const parsed = manualReviewSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Невалидни данни." };
  }

  await db.insert(schema.googleReviews).values({
    id: `manual-${nanoid()}`,
    authorName: parsed.data.authorName,
    authorPhoto: null,
    rating: parsed.data.rating,
    text: parsed.data.text,
    language: "bg",
    publishedAt: parsed.data.publishedAt,
    fetchedAt: new Date(),
  });

  revalidatePath("/admin/reviews");
  revalidatePath("/");
  return { ok: true as const };
}
