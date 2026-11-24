import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

/** Колко подбрани снимки (по sort_order) стоят най-отгоре, преди снимките от специалистите (визия №32). */
const CURATED_TOP = 8;

/**
 * Снимките, които могат да излязат на сайта: одобрените и старите (те са status = "approved").
 * Редът (визия №32): първите 8 подбрани снимки (без uploaded_by) по sort_order, после одобрените
 * снимки от специалистите (най-новата отпред), после останалите подбрани по sort_order.
 * Чакащите и върнатите снимки от специалистите НИКОГА не минават оттук. Всяка публична страница
 * чете галерията само през тази функция (тест: public-gallery.leak.test.ts).
 */
export async function listPublicGalleryImages(opts: { limit?: number } = {}) {
  const all = await db.query.galleryImages.findMany({
    where: eq(schema.galleryImages.status, "approved"),
    orderBy: (g, { asc }) => [asc(g.sortOrder)],
  });
  const curated = all.filter((g) => g.uploadedBy == null);
  const fromStaff = all
    .filter((g) => g.uploadedBy != null)
    .sort((a, b) => (b.approvedAt?.getTime() ?? 0) - (a.approvedAt?.getTime() ?? 0));
  const ordered = [...curated.slice(0, CURATED_TOP), ...fromStaff, ...curated.slice(CURATED_TOP)];
  return opts.limit ? ordered.slice(0, opts.limit) : ordered;
}
