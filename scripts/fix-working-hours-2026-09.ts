/* eslint-disable no-console */
/**
 * Одит №7: обявеното работно време (Пон-Пет 09-18) не съвпадаше с реалното.
 * Снежана — единственият фризьор — работи Вто-Пет 10:00-19:00 и Съб 10:00-17:00,
 * а в понеделник няма нито един запис за три месеца.
 *
 * Сайтът вече обявява реалното (siteConfig.hours). Този скрипт изравнява и
 * САЛОННИЯ график в базата, който служи за fallback на изпълнители без собствен
 * график (`slots.ts` ползва ownWh ?? salonWh). Без него нов изпълнител би
 * наследил стария, невярен график.
 *
 * Пускане:  npx tsx scripts/fix-working-hours-2026-09.ts          (dry-run)
 *           npx tsx scripts/fix-working-hours-2026-09.ts --apply
 */
import "./load-env";
import { eq } from "drizzle-orm";
import { siteConfig } from "../src/lib/site";

const APPLY = process.argv.includes("--apply");
const NAMES = ["Неделя", "Понеделник", "Вторник", "Сряда", "Четвъртък", "Петък", "Събота"];

/** Желаното състояние per weekday, изведено от единствения източник в кода. */
function desired(weekday: number): { open: string | null; close: string | null; closed: boolean } {
  const row = siteConfig.hours.find((h) => (h.weekdays as readonly number[]).includes(weekday));
  if (!row || !row.close) return { open: null, close: null, closed: true };
  return { open: row.open, close: row.close, closed: false };
}

async function main() {
  const { db, schema } = await import("../src/lib/db");
  const rows = await db.query.workingHours.findMany();

  const plan = rows
    .map((r) => ({ row: r, want: desired(r.weekday) }))
    .filter(
      ({ row, want }) =>
        row.closed !== want.closed || row.openTime !== want.open || row.closeTime !== want.close,
    );

  console.log("Салонен график — текущо срещу желано:\n");
  for (const r of [...rows].sort((a, b) => a.weekday - b.weekday)) {
    const w = desired(r.weekday);
    const now = r.closed ? "почивен" : `${r.openTime}-${r.closeTime}`;
    const next = w.closed ? "почивен" : `${w.open}-${w.close}`;
    const mark = now === next ? " " : "→";
    console.log(`  ${mark} ${NAMES[r.weekday].padEnd(11)} ${now.padEnd(12)} ${mark === "→" ? next : ""}`);
  }
  console.log(`\nЗа промяна: ${plan.length} реда`);

  if (!APPLY) {
    console.log("DRY-RUN. Пусни с --apply, за да запише.");
    process.exit(0);
  }

  for (const { row, want } of plan) {
    await db
      .update(schema.workingHours)
      .set({ openTime: want.open, closeTime: want.close, closed: want.closed })
      .where(eq(schema.workingHours.weekday, row.weekday));
  }
  console.log(`✓ Обновени ${plan.length} реда.`);
  console.log("Личните графици на изпълнителите НЕ са пипани — те имат предимство пред салонния.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
