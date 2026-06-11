/**
 * Google Places API (New) integration за реални отзиви.
 *
 * За пълен списък ревюта (>5) е нужен Google Business Profile API + OAuth flow.
 * Place Details дава 5 most-relevant ревюта без OAuth — достатъчно за публичен widget.
 *
 * Ползваме Places API (NEW) — legacy Place Details не е достъпен за нови
 * Google Cloud проекти. В конзолата се активира „Places API (New)".
 *
 * Setup:
 *   1. Създай API ключ в Google Cloud Console (Places API (New) enabled)
 *   2. Добави GOOGLE_PLACES_API_KEY в .env.local + Vercel env
 *   3. GOOGLE_PLACE_ID на салона: ChIJAadCMDVVpEAR15dn6Gh-2U4 (намерен 06.2026)
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

  const url = `https://places.googleapis.com/v1/places/${placeId}?languageCode=bg`;

  try {
    const res = await fetch(url, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "rating,userRatingCount,reviews",
      },
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error(`Places API (New) ${res.status}: ${await res.text()}`);

    const json = (await res.json()) as {
      rating?: number;
      userRatingCount?: number;
      reviews?: Array<{
        rating: number;
        text?: { text: string; languageCode?: string };
        originalText?: { text: string; languageCode?: string };
        authorAttribution?: { displayName?: string; photoUri?: string };
        publishTime: string;
      }>;
    };

    return {
      rating: json.rating ?? 0,
      totalReviews: json.userRatingCount ?? 0,
      reviews: (json.reviews ?? [])
        .filter((r) => r.authorAttribution?.displayName && (r.text?.text || r.originalText?.text))
        .map((r) => ({
          authorName: r.authorAttribution!.displayName!,
          authorPhoto: r.authorAttribution?.photoUri,
          rating: r.rating,
          text: r.text?.text ?? r.originalText?.text ?? "",
          language: r.text?.languageCode ?? r.originalText?.languageCode,
          publishedAt: new Date(r.publishTime),
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
