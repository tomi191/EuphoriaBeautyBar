/** Read-only: козметика услуги — дължина на описанията + има ли уникална снимка. */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { db } from "../src/lib/db";
import { slugify } from "../src/lib/utils";

async function main() {
  const cat = await db.query.serviceCategories.findFirst({ where: (c, { eq }) => eq(c.slug, "kozmetika") });
  if (!cat) { console.error("няма козметика"); process.exit(1); }
  const items = await db.query.serviceItems.findMany({
    where: (s, { and, eq }) => and(eq(s.categoryId, cat.id), eq(s.bookableOnline, true)),
    orderBy: (s, { asc }) => [asc(s.sortOrder)],
  });

  let noImg = 0, longDesc = 0;
  console.log(`Козметика: ${items.length} услуги\n`);
  for (const i of items) {
    const slug = slugify(i.name);
    const hasImg = existsSync(join(process.cwd(), "public/images/services/unique", `${slug}.webp`));
    const d = i.description?.length ?? 0;
    if (!hasImg) noImg++;
    if (d > 140) longDesc++;
    const flag = !hasImg ? "✗СНИМКА" : "       ";
    const dl = (d > 140 ? `📜${d}` : `${d}`).padEnd(7);
    console.log(`${flag} ${dl} | ${i.name}`);
    if (d > 140) console.log(`           „${i.description}"`);
  }
  console.log(`\n— ${noImg} без снимка · ${longDesc} с дълго описание (>140 симв)`);
  process.exit(0);
}
main().catch((e) => { console.error("✗", e?.message ?? e); process.exit(1); });
