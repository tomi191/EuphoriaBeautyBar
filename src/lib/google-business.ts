/**
 * Google Place Details API integration за реални отзиви.
 *
 * За пълен списък ревюта (>5) е нужен Google Business Profile API + OAuth flow.
 * Place Details дава 5 most-relevant ревюта без OAuth — достатъчно за публичен widget.
 *
 * Setup:
 *   1. Създай API ключ в Google Cloud Console (Places API enabled)
 *   2. Добави GOOGLE_PLACES_API_KEY и GOOGLE_PLACE_ID в .env
 *   3. Намери Place ID на https://developers.google.com/maps/documentation/places/web-service/place-id
 */

export interface PlaceReview {
  authorName: string;
  authorPhoto?: string;
  rating: number;
  text: string;
  language?: string;
  publishedAt: Date;
}

export interface PlaceSummary {
  rating: number;
  totalReviews: number;
  reviews: PlaceReview[];
}

export async function fetchPlaceReviews(): Promise<PlaceSummary | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.GOOGLE_PLACE_ID;
  if (!apiKey || !placeId) return null;

  const url =
    `https://maps.googleapis.com/maps/api/place/details/json` +
    `?place_id=${placeId}` +
    `&fields=rating,user_ratings_total,reviews` +
    `&language=bg` +
    `&key=${apiKey}`;

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`Place API ${res.status}`);

    const json = (await res.json()) as {
      status: string;
      result?: {
        rating?: number;
        user_ratings_total?: number;
        reviews?: Array<{
          author_name: string;
          profile_photo_url?: string;
          rating: number;
          text: string;
          language?: string;
          time: number;
        }>;
      };
    };

    if (json.status !== "OK" || !json.result) return null;

    return {
      rating: json.result.rating ?? 0,
      totalReviews: json.result.user_ratings_total ?? 0,
      reviews: (json.result.reviews ?? []).map((r) => ({
        authorName: r.author_name,
        authorPhoto: r.profile_photo_url,
        rating: r.rating,
        text: r.text,
        language: r.language,
        publishedAt: new Date(r.time * 1000),
      })),
    };
  } catch (err) {
    console.error("[google-business] fetch failed", err);
    return null;
  }
}

export async function syncReviewsToDatabase() {
  "use server";
  const { db, schema } = await import("@/lib/db");
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

  return { ok: true, count: summary.reviews.length, rating: summary.rating, total: summary.totalReviews };
}
