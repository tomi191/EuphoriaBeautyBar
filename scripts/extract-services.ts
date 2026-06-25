/** Извлича всички bookableOnline услуги (име, група, категория, slug) → JSON за генериране на снимки. */
import { writeFileSync } from "node:fs";
import { db } from "../src/lib/db";
import { slugify } from "../src/lib/utils";

async function main() {
  const cats = await db.query.serviceCategories.findMany();
  const catById = new Map(cats.map((c) => [c.id, c]));
  const items = await db.query.serviceItems.findMany({ where: (s, { eq }) => eq(s.bookableOnline, true), orderBy: (s, { asc }) => [asc(s.sortOrder)] });

  const out = items.map((i) => ({
    slug: slugify(i.name),
    name: i.name,
    group: i.groupTitle,
    category: catById.get(i.categoryId)?.shortTitle ?? "",
    description: i.description ?? null,
  }));

  const path = process.argv[2] ?? "services.json";
  writeFileSync(path, JSON.stringify(out, null, 2));
  console.log(`✅ ${out.length} услуги → ${path}`);
  // Кратък преглед по категория
  const byCat: Record<string, number> = {};
  for (const o of out) byCat[o.category] = (byCat[o.category] ?? 0) + 1;
  console.log(byCat);
  process.exit(0);
}
main().catch((e) => { console.error("✗", e?.message ?? e); process.exit(1); });
