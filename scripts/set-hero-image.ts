/**
 * Обновява heroImage на услуга-категория в DB (canonical източник за снимките).
 *
 * Пускане:
 *   npx tsx --env-file=.env.local scripts/set-hero-image.ts <slug> <imagePath>
 * Пример:
 *   npx tsx --env-file=.env.local scripts/set-hero-image.ts frizorski-terapii /images/services/frizorski-terapii-hero.png
 */
import { eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { serviceCategories } from "../src/lib/db/schema";

async function main() {
  const [, , slug, imagePath] = process.argv;
  if (!slug || !imagePath) {
    throw new Error("Usage: set-hero-image.ts <slug> <imagePath>");
  }
  const before = await db.query.serviceCategories.findFirst({
    where: (c, { eq: e }) => e(c.slug, slug),
    columns: { slug: true, heroImage: true },
  });
  if (!before) throw new Error(`Категория с slug "${slug}" не е намерена`);
  console.log(`  преди: ${before.heroImage}`);

  await db.update(serviceCategories).set({ heroImage: imagePath }).where(eq(serviceCategories.slug, slug));
  console.log(`✓ heroImage за "${slug}" → ${imagePath}`);
  process.exit(0);
}

main().catch((e) => {
  console.error("✗", e.message ?? e);
  process.exit(1);
});
