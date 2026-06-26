/**
 * Прилага почистените козметика имена/описания от Workflow-а. Дубликатите се
 * скриват (bookableOnline=false, non-destructive). Money услугите (suggestPage)
 * се извеждат за по-нататъшна programmatic страница.
 * Пускане: npx tsx --env-file=.env.local scripts/apply-kozmetika-clean.ts <cleaned.json>
 */
import { eq } from "drizzle-orm";
import { readFileSync } from "node:fs";
import { db, schema } from "../src/lib/db";

interface Cleaned {
  id: string; shortName: string; shortDescription: string;
  isDuplicate: boolean; keepInstead: string; suggestPage: boolean;
}

async function main() {
  const cleaned: Cleaned[] = JSON.parse(readFileSync(process.argv[2], "utf8"));
  let updated = 0, hidden = 0;
  const pages: string[] = [];
  for (const c of cleaned) {
    if (c.isDuplicate) {
      await db.update(schema.serviceItems).set({ bookableOnline: false }).where(eq(schema.serviceItems.id, c.id));
      hidden++;
      console.log(`  ⊘ дубликат скрит: „${c.shortName}"`);
    } else {
      await db.update(schema.serviceItems).set({ name: c.shortName, description: c.shortDescription }).where(eq(schema.serviceItems.id, c.id));
      updated++;
      console.log(`  ✓ ${c.shortName}\n      „${c.shortDescription}"`);
      if (c.suggestPage) pages.push(c.shortName);
    }
  }
  console.log(`\n✅ ${updated} обновени · ${hidden} дубликати скрити`);
  if (pages.length) console.log(`📄 Заслужават programmatic страница: ${pages.join(", ")}`);
  process.exit(0);
}
main().catch((e) => { console.error("✗", e?.message ?? e); process.exit(1); });
