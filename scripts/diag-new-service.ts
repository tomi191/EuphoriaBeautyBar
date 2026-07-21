/* eslint-disable no-console */
/** Диагностика: намери услуга по част от името + нейната група/категория/оферти.
 * Пускане: npx tsx --env-file=.env.local scripts/diag-new-service.ts <част от име> */
import { db } from "../src/lib/db";

async function main() {
  const q = (process.argv[2] ?? "ботокс").toLowerCase();
  const items = await db.query.serviceItems.findMany();
  const cats = await db.query.serviceCategories.findMany();
  const hits = items.filter((i) => i.name.toLowerCase().includes(q));
  for (const i of hits) {
    const c = cats.find((x) => x.id === i.categoryId);
    console.log(JSON.stringify({
      id: i.id, name: i.name, group: i.groupTitle, category: c?.slug,
      price: i.price, priceFrom: i.priceFrom, durationMin: i.durationMin,
      description: i.description,
    }, null, 2));
  }
  if (hits.length === 0) console.log(`Няма услуга съдържаща „${q}".`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
