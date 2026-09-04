/* eslint-disable no-console */
/**
 * Одит №7: 46 снимки в галерията делят генерични alt текстове — 20 от тях са
 * дословно „Euphoria Hair & Beauty Bar — работа от салона“, останалите са
 * „…снимка 15“. Нула стойност за екранен четец и за Google Images.
 *
 * Скриптът пренаписва alt САМО на редовете без собствено описание, използвайки
 * категорията (реален избор на човека при качването). Снимки с описание не се
 * пипат — там alt-ът вече казва какво се вижда.
 *
 * Пускане:  npx tsx scripts/fix-gallery-alt-2026-09.ts          (dry-run)
 *           npx tsx scripts/fix-gallery-alt-2026-09.ts --apply  (записва)
 */
import "./load-env";
import { eq } from "drizzle-orm";
import { galleryAlt } from "../src/lib/data/gallery";

const APPLY = process.argv.includes("--apply");

async function main() {
  const { db, schema } = await import("../src/lib/db");
  const rows = await db.query.galleryImages.findMany({
    columns: { id: true, alt: true, category: true, description: true },
  });

  const planned = rows
    .filter((r) => !r.description?.trim())
    .map((r) => ({ id: r.id, from: r.alt, to: galleryAlt(r.category, r.description) }))
    .filter((p) => p.from !== p.to);

  console.log(`Снимки общо: ${rows.length}`);
  console.log(`Със собствено описание (не се пипат): ${rows.filter((r) => r.description?.trim()).length}`);
  console.log(`За обновяване: ${planned.length}\n`);

  const preview = new Map<string, number>();
  for (const p of planned) preview.set(p.to, (preview.get(p.to) ?? 0) + 1);
  for (const [alt, n] of preview) console.log(`  ${n}×  ${alt}`);

  if (!APPLY) {
    console.log("\nDRY-RUN. Пусни с --apply, за да запише.");
    process.exit(0);
  }

  for (const p of planned) {
    await db.update(schema.galleryImages).set({ alt: p.to }).where(eq(schema.galleryImages.id, p.id));
  }
  console.log(`\n✓ Обновени ${planned.length} реда.`);
  console.log("Забележка: /galeriya е динамична, но пусни deploy/revalidate, ако кешът е топъл.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
