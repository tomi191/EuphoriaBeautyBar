"use server";

import { revalidatePath } from "next/cache";
import { eq, notLike } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { fetchPlaceReviews } from "@/lib/google-business";
import { fetchFeaturableReviews } from "@/lib/featurable";
import { deleteConnection, fetchGbpReviews } from "@/lib/google-oauth";
import { requireAdmin } from "@/lib/actions/auth-guard";

// Линк към Google профила (за „Виж в Google" в публичната секция).
const PLACE_URL = "https://www.google.com/maps/place/?q=place_id:ChIJAadCMDVVpEAR15dn6Gh-2U4";

/**
 * Ядрото на sync-а (без auth) — преизползва се от admin action и от cron route.
 * Приоритет: Featurable (всички отзиви, безплатно, public widget — без secret) →
 * Business Profile OAuth → Places API (5). Запазва ръчните ("manual-") отзиви,
 * вкл. ръчно добавения негативен (за прозрачност), който източниците филтрират.
 */
export async function runReviewsSync() {
  const summary = (await fetchFeaturableReviews()) ?? (await fetchGbpReviews()) ?? (await fetchPlaceReviews());
  if (!summary) return { ok: false as const, reason: "missing-credentials" as const };

  // Транзакция: ако insert гръмне, delete-ът се връща — иначе публичната секция
  // остава с полупразна таблица. Ръчните отзиви (id "manual-…") оцеляват; sync
  // ID-тата са nanoid (без колизии от име+timestamp ключ).
  await db.transaction(async (tx) => {
    await tx.delete(schema.googleReviews).where(notLike(schema.googleReviews.id, "manual-%"));
    for (const r of summary.reviews) {
      await tx.insert(schema.googleReviews).values({
        id: `sync-${nanoid()}`,
        authorName: r.authorName,
        authorPhoto: r.authorPhoto ?? null,
        rating: r.rating,
        text: r.text,
        language: r.language ?? null,
        publishedAt: r.publishedAt,
        fetchedAt: new Date(),
      });
    }
    // Реалните брой/рейтинг за header-а (вкл. отзивите само със звезди, които не
    // се визуализират) — иначе header-ът би показал 5,0/24 вместо реалните 4,8/43.
    const summaryValue = { rating: summary.rating, total: summary.totalReviews, placeUrl: PLACE_URL, fetchedAt: new Date().toISOString() };
    await tx
      .insert(schema.siteSettings)
      .values({ key: "google_reviews_summary", value: summaryValue, updatedAt: new Date() })
      .onConflictDoUpdate({ target: schema.siteSettings.key, set: { value: summaryValue, updatedAt: new Date() } });
  });

  return { ok: true as const, count: summary.reviews.length, rating: summary.rating, total: summary.totalReviews };
}

export async function syncGoogleReviews() {
  await requireAdmin();
  const res = await runReviewsSync();
  revalidatePath("/admin/reviews");
  revalidatePath("/");
  return res;
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
