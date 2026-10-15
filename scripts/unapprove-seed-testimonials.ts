/* eslint-disable no-console */
import "./load-env";
import { eq } from "drizzle-orm";

/**
 * Статичните отзиви в src/lib/data/testimonials.ts са примерни (seed) данни. Ако
 * са влезли в таблицата testimonials, публичният сайт ще ги покаже като реални.
 * Скриптът маха одобрението на редовете, чиито (name, quote) съвпадат със seed-а.
 * Dry-run по подразбиране, `--apply` пише.
 */
const APPLY = process.argv.includes("--apply");

async function main() {
  const { db, schema } = await import("../src/lib/db");
  const { testimonials: seed } = await import("../src/lib/data/testimonials");
  const keys = new Set(seed.map((t) => `${t.name}||${t.quote}`));

  const rows = await db.query.testimonials.findMany();
  const matches = rows.filter((r) => keys.has(`${r.name}||${r.quote}`));
  console.log(`В базата: ${rows.length} отзива, seed съвпадения: ${matches.length}`);

  for (const r of matches) {
    console.log(`${r.approved ? "~" : "="} ${r.id} ${r.name}: approved ${r.approved} -> false`);
    if (APPLY && r.approved) {
      await db.update(schema.testimonials).set({ approved: false }).where(eq(schema.testimonials.id, r.id));
    }
  }
  console.log(APPLY ? "\nПРИЛОЖЕНО." : "\nDRY-RUN (нищо не е записано). Добави --apply за запис.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
