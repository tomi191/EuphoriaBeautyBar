/** Извлича bookableOnline услугите БЕЗ уникална снимка → JSON за генериране. */
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { db } from "../src/lib/db";
import { slugify } from "../src/lib/utils";

async function main() {
  const cats = await db.query.serviceCategories.findMany();
  const catById = new Map(cats.map((c) => [c.id, c]));
  const items = await db.query.serviceItems.findMany({ where: (s, { eq }) => eq(s.bookableOnline, true) });
  const missing = items
    .filter((i) => !existsSync(join(process.cwd(), "public/images/services/unique", `${slugify(i.name)}.webp`)))
    .map((i) => ({ slug: slugify(i.name), name: i.name, group: i.groupTitle, description: i.description, category: catById.get(i.categoryId)?.shortTitle ?? "" }));
  writeFileSync(process.argv[2], JSON.stringify(missing, null, 2));
  console.log(`${missing.length} услуги без снимка → ${process.argv[2]}`);
  missing.forEach((m) => console.log(`  - ${m.name}`));
  process.exit(0);
}
main().catch((e) => { console.error("✗", e?.message ?? e); process.exit(1); });
