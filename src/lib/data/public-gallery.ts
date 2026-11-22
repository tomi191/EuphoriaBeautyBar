import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

/**
 * Снимките, които могат да излязат на сайта: одобрените и старите (те са status = "approved").
 * Чакащите и върнатите снимки от специалистите НИКОГА не минават оттук. Всяка публична страница
 * чете галерията само през тази функция (тест: public-gallery.leak.test.ts).
 */
export function listPublicGalleryImages(opts: { limit?: number } = {}) {
  return db.query.galleryImages.findMany({
    where: eq(schema.galleryImages.status, "approved"),
    orderBy: (g, { asc }) => [asc(g.sortOrder)],
    ...(opts.limit ? { limit: opts.limit } : {}),
  });
}
