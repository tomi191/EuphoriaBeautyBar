/**
 * Backup на всички козметика услуги (за revert) + извличане на проблемните
 * (дълги имена-параграфи) за почистване от Workflow.
 * Пускане: npx tsx --env-file=.env.local scripts/backup-extract-kozmetika.ts <backup.json> <problematic.json>
 */
import { writeFileSync } from "node:fs";
import { db } from "../src/lib/db";

async function main() {
  const cat = await db.query.serviceCategories.findFirst({ where: (c, { eq }) => eq(c.slug, "kozmetika") });
  if (!cat) { console.error("няма козметика"); process.exit(1); }
  const items = await db.query.serviceItems.findMany({
    where: (s, { eq }) => eq(s.categoryId, cat.id),
    orderBy: (s, { asc }) => [asc(s.sortOrder)],
  });

  const backup = items.map((i) => ({ id: i.id, name: i.name, description: i.description, price: i.price, groupTitle: i.groupTitle, bookableOnline: i.bookableOnline }));
  writeFileSync(process.argv[2], JSON.stringify(backup, null, 2));

  // Проблемни: име > 55 символа (параграф) ИЛИ description > 140.
  const problematic = items
    .filter((i) => i.name.length > 55 || (i.description?.length ?? 0) > 140)
    .map((i) => ({ id: i.id, name: i.name, description: i.description, group: i.groupTitle }));
  writeFileSync(process.argv[3], JSON.stringify(problematic, null, 2));

  console.log(`✅ Backup: ${items.length} услуги → ${process.argv[2]}`);
  console.log(`📜 Проблемни (дълго име/описание): ${problematic.length} → ${process.argv[3]}`);
  process.exit(0);
}
main().catch((e) => { console.error("✗", e?.message ?? e); process.exit(1); });
