/* eslint-disable no-console */
/** Диагностика на Google reviews състоянието (read-only).
 * npx tsx --env-file=.env.local scripts/check-reviews.ts */
import { db } from "../src/lib/db";
import { fetchPlaceReviews } from "../src/lib/google-business";
import { getConnection, oauthConfigured } from "../src/lib/google-oauth";

async function main() {
  console.log("=== ENV / ИЗТОЧНИЦИ ===");
  console.log("GOOGLE_PLACES_API_KEY:", !!process.env.GOOGLE_PLACES_API_KEY);
  console.log("GOOGLE_PLACE_ID:", process.env.GOOGLE_PLACE_ID ?? "—");
  console.log("OAuth client конфигуриран:", oauthConfigured());
  const conn = await getConnection();
  console.log("GBP OAuth връзка:", conn ? `ДА (${conn.locationTitle || conn.locationName})` : "НЕ");

  const reviews = await db.query.googleReviews.findMany();
  const byType = { manual: 0, sync: 0, other: 0 };
  for (const r of reviews) {
    if (r.id.startsWith("manual-")) byType.manual++;
    else if (r.id.startsWith("sync-")) byType.sync++;
    else byType.other++;
  }
  console.log(`\n=== В БАЗАТА: ${reviews.length} отзива ===`, byType);

  if (process.env.GOOGLE_PLACES_API_KEY && process.env.GOOGLE_PLACE_ID) {
    console.log("\n=== ТЕСТ Places API ===");
    const summary = await fetchPlaceReviews();
    if (summary) {
      console.log(`Тегли ${summary.reviews.length} отзива | среден рейтинг ${summary.rating} | ОБЩО на профила: ${summary.totalReviews}`);
      for (const r of summary.reviews.slice(0, 3)) console.log(`  ${r.rating}★ ${r.authorName}: ${r.text.slice(0, 70)}...`);
    } else {
      console.log("Places API върна null (грешка или липсва ключ).");
    }
  }
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
