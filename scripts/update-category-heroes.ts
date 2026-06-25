/**
 * Сменя slop категорийните hero снимки с представителни уникални услуга-снимки.
 * Пускане: npx tsx --env-file=.env.local scripts/update-category-heroes.ts
 */
import { eq } from "drizzle-orm";
import { db, schema } from "../src/lib/db";

const MAP: Record<string, string> = {
  "frizorski-uslugi": "/images/services/unique/balayazh-sredna-kosa.webp",
  "frizorski-terapii": "/images/services/unique/keratinova-terapiya-kerasilk-goldwell.webp",
  "manikyur-i-pedikyur": "/images/services/unique/manikyur-s-gel-lak.webp",
  "kozmetika": "/images/services/unique/hydra-facial-pochistvane.webp",
};

async function main() {
  const cats = await db.query.serviceCategories.findMany();
  for (const c of cats) {
    const img = MAP[c.slug];
    if (img && img !== c.heroImage) {
      await db.update(schema.serviceCategories).set({ heroImage: img }).where(eq(schema.serviceCategories.id, c.id));
      console.log(`  ✓ ${c.slug}: ${c.heroImage} → ${img}`);
    } else {
      console.log(`  · ${c.slug}: ${c.heroImage}${img ? " (вече ок)" : " (няма в map)"}`);
    }
  }
  console.log("\n✅ Категория hero снимки обновени.");
  process.exit(0);
}
main().catch((e) => { console.error("✗", e?.message ?? e); process.exit(1); });
