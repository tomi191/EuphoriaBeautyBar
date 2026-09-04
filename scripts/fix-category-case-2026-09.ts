/* eslint-disable no-console */
/**
 * Одит №7 (и №6 преди него): имената на категориите в базата са в Title Case —
 * „Фризьорски Услуги“, „Маникюр и Педикюр“. Българският правопис няма title case;
 * това е директен превод от английски и е сред по-разпознаваемите следи от
 * машинно писане. Имената излизат в менюто, на началната, в заглавията на
 * категорийните страници, в трохите и в structured data.
 *
 * Пускане:  npx tsx scripts/fix-category-case-2026-09.ts          (dry-run)
 *           npx tsx scripts/fix-category-case-2026-09.ts --apply
 */
import "./load-env";
import { eq } from "drizzle-orm";

const APPLY = process.argv.includes("--apply");

const RENAMES: Record<string, string> = {
  "frizorski-uslugi": "Фризьорски услуги",
  "frizorski-terapii": "Фризьорски терапии",
  "manikyur-i-pedikyur": "Маникюр и педикюр",
};

async function main() {
  const { db, schema } = await import("../src/lib/db");
  const rows = await db.query.serviceCategories.findMany();

  const plan = rows
    .filter((r) => RENAMES[r.slug] && r.title !== RENAMES[r.slug])
    .map((r) => ({ row: r, title: RENAMES[r.slug] }));

  for (const p of plan) console.log(`  ${p.row.title}  →  ${p.title}`);
  console.log(`\nЗа промяна: ${plan.length} от ${rows.length}`);

  if (!APPLY) {
    console.log("DRY-RUN. Пусни с --apply, за да запише.");
    process.exit(0);
  }

  for (const p of plan) {
    await db.update(schema.serviceCategories).set({ title: p.title }).where(eq(schema.serviceCategories.id, p.row.id));
  }
  console.log(`✓ Обновени ${plan.length} реда.`);
  console.log("Slug-овете НЕ са пипани → URL-ите и redirect-ите остават същите.");
  console.log("Статичните /uslugi* страници нямат ISR — нужен е нов build, за да се видят.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
