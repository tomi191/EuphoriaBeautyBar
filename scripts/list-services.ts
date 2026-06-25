/** Read-only: всички услуги по категория/група — за категоризация на изображения. */
import { db } from "../src/lib/db";

async function main() {
  const cats = await db.query.serviceCategories.findMany({ orderBy: (c, { asc }) => [asc(c.sortOrder)] });
  const items = await db.query.serviceItems.findMany({ orderBy: (s, { asc }) => [asc(s.sortOrder)] });
  for (const c of cats) {
    const its = items.filter((i) => i.categoryId === c.id && i.bookableOnline);
    if (!its.length) continue;
    console.log(`\n### ${c.title} (${c.slug}) — ${its.length} услуги`);
    const byGroup = new Map<string, string[]>();
    for (const i of its) {
      const arr = byGroup.get(i.groupTitle) ?? [];
      arr.push(`${i.name} [${i.durationMin}мин]`);
      byGroup.set(i.groupTitle, arr);
    }
    for (const [g, names] of byGroup) {
      console.log(`  • ${g}:`);
      for (const n of names) console.log(`      - ${n}`);
    }
  }
  process.exit(0);
}
main().catch((e) => { console.error("✗", e?.message ?? e); process.exit(1); });
