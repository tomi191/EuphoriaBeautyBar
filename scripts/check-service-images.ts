/** Read-only: коя bookableOnline услуга има снимка (serviceImageFor) и дали файлът съществува. */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { db } from "../src/lib/db";
import { serviceImageFor } from "../src/lib/booking/length-icon";

async function main() {
  const items = await db.query.serviceItems.findMany({ where: (s, { eq }) => eq(s.bookableOnline, true) });
  let withImg = 0;
  const noMatch: string[] = [];
  const missingFile: string[] = [];
  const used = new Set<string>();

  for (const i of items) {
    const img = serviceImageFor(i.name, i.groupTitle);
    if (!img) { noMatch.push(`[${i.groupTitle}] ${i.name}`); continue; }
    withImg++;
    used.add(img);
    const path = join(process.cwd(), "public", img);
    if (!existsSync(path)) missingFile.push(`${i.name} → ${img}`);
  }

  console.log(`Услуги (bookableOnline): ${items.length}`);
  console.log(`  ✅ със снимка: ${withImg}`);
  console.log(`  ⚪ без съвпадение (null): ${noMatch.length}`);
  console.log(`  ❌ снимка липсва на диска: ${missingFile.length}`);
  console.log(`  🖼  уникални снимки използвани: ${used.size}`);
  if (noMatch.length) console.log(`\n=== Услуги БЕЗ снимка ===\n  ${noMatch.join("\n  ")}`);
  if (missingFile.length) console.log(`\n=== Снимка липсва на диска ===\n  ${missingFile.join("\n  ")}`);
  console.log(`\n=== Използвани файлове ===\n  ${[...used].sort().join("\n  ")}`);
  process.exit(0);
}
main().catch((e) => { console.error("✗", e?.message ?? e); process.exit(1); });
