/**
 * Featurable integration — безплатно автоматично теглене на ВСИЧКИ Google отзиви.
 *
 * Featurable (като WP плъгините) се свързва веднъж с Google Business профила на
 * салона и sync-ва отзивите на всеки ~24-48ч. Чете се през публичен widget endpoint
 * със само widget ID (БЕЗ API key / secret) — затова заобикаля и Google Business
 * Profile API одобрението, и OAuth setup-а.
 *
 * Setup: акаунт на featurable.com → свържи Google профила → widget ID в
 * FEATURABLE_WIDGET_ID (публично, не е secret).
 *
 * Endpoint: GET https://api.featurable.com/v1/widgets/{widgetId}
 */
import type { PlaceSummary } from "@/lib/google-business";

const ENDPOINT = "https://api.featurable.com/v1/widgets";
// Публичен widget ID (НЕ secret — вижда се в самия widget). Fallback в кода, за да
// работи cron-ът на prod без ръчна Vercel env промяна; override чрез env при нужда.
const DEFAULT_WIDGET_ID = "b4ad17a8-7079-44b6-a98e-d1d338f808f6";

interface FeaturableReview {
  reviewId: string;
  reviewer: { displayName: string; profilePhotoUrl?: string };
  starRating: number;
  comment: string;
  createTime: string;
  updateTime?: string;
}

interface FeaturableResponse {
  success: boolean;
  totalReviewCount: number;
  averageRating: number;
  reviews: FeaturableReview[];
}

/**
 * Извлича оригиналния (български) текст от Google-преведен коментар.
 * Google връща „(Translated by Google)\n<превод>\n\n(Original)\n<оригинал>".
 */
export function extractOriginalText(comment: string): string {
  const marker = comment.indexOf("(Original)");
  if (marker !== -1) return comment.slice(marker + "(Original)".length).trim();
  return comment.replace(/^\(Translated by Google\)\s*/i, "").trim();
}

/** Чете отзивите от Featurable widget-а. null, ако widget ID липсва или заявката се провали. */
export async function fetchFeaturableReviews(): Promise<PlaceSummary | null> {
  const widgetId = process.env.FEATURABLE_WIDGET_ID ?? DEFAULT_WIDGET_ID;
  if (!widgetId) return null;

  try {
    const res = await fetch(`${ENDPOINT}/${widgetId}`, {
      headers: { accept: "application/json" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error(`Featurable ${res.status}: ${await res.text()}`);

    const json = (await res.json()) as FeaturableResponse;
    if (!json.success || !Array.isArray(json.reviews)) return null;

    return {
      rating: json.averageRating,
      totalReviews: json.totalReviewCount,
      reviews: json.reviews
        .filter((r) => r.comment && r.reviewer?.displayName)
        .map((r) => ({
          authorName: r.reviewer.displayName,
          authorPhoto: r.reviewer.profilePhotoUrl,
          rating: r.starRating,
          text: extractOriginalText(r.comment),
          language: "bg",
          publishedAt: new Date(r.createTime),
        })),
    };
  } catch (err) {
    console.error("[featurable] fetch failed", err);
    return null;
  }
}
