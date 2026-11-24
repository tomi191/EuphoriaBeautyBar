import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

/**
 * Снимките, които могат да излязат на сайта: одобрените и старите (те са status = "approved").
 * Редът: одобрените снимки от специалистите отпред (по одобрение), после sort_order.
 * Чакащите и върнатите снимки от специалистите НИКОГА не минават оттук. Всяка публична страница
 * чете галерията само през тази функция (тест: public-gallery.leak.test.ts).
 */
export function listPublicGalleryImages(opts: { limit?: number } = {}) {
  return db.query.galleryImages.findMany({
    where: eq(schema.galleryImages.status, "approved"),
    // Първо новите одобрени снимки от специалистите (най-новата отпред), после по реда в базата.
    orderBy: (g, { asc, sql }) => [
      sql`${g.uploadedBy} is null`,
      sql`${g.approvedAt} desc nulls last`,
      asc(g.sortOrder),
    ],
    ...(opts.limit ? { limit: opts.limit } : {}),
  });
}
