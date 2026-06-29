/* eslint-disable no-console */
/** Поправя cron-артефактните no_show → completed за МИНАЛИ часове (празен график + нулев оборот).
 *  Dry-run по подразбиране; прилага само с --apply. cancelled НЕ се пипа (легитимни отмени).
 *  Пускане: npx tsx scripts/fix-noshow-to-completed.ts [--apply] */
import "./load-env";
import { eq } from "drizzle-orm";
import { db, schema } from "../src/lib/db";
import { sofiaDateStr, sofiaTimeLabel } from "../src/lib/booking/time";

const APPLY = process.argv.includes("--apply");

async function main() {
  const now = new Date();
  const rows = await db.query.bookings.findMany({
    where: (b, { and, eq: e, lt }) => and(e(b.status, "no_show"), lt(b.startAt, now)),
    orderBy: (b, { asc }) => [asc(b.startAt)],
  });
  const resources = await db.query.resources.findMany();
  const resName = new Map(resources.map((r) => [r.id, r.name]));
  const byRes: Record<string, number> = {};
  for (const b of rows) {
    const n = resName.get(b.resourceId) ?? b.resourceId;
    byRes[n] = (byRes[n] ?? 0) + 1;
  }
  console.log(`\nМинали no_show часове: ${rows.length}`);
  console.log(`По изпълнител: ${JSON.stringify(byRes)}`);
  console.log(`\nПримери (първи 8):`);
  for (const b of rows.slice(0, 8)) {
    console.log(`  • ${sofiaDateStr(b.startAt)} ${sofiaTimeLabel(b.startAt)} | ${resName.get(b.resourceId)} | ${b.serviceName}`);
  }

  if (!APPLY) {
    console.log(`\n⚠️ DRY-RUN — нищо не е променено. Пусни с --apply, за да приложиш (${rows.length} → completed).`);
    process.exit(0);
  }

  let n = 0;
  for (const b of rows) {
    await db.update(schema.bookings).set({ status: "completed", updatedAt: new Date() }).where(eq(schema.bookings.id, b.id));
    n++;
  }
  console.log(`\n✅ Приложено: ${n} часа no_show → completed.`);
  process.exit(0);
}
main().catch((e) => { console.error("✗", e?.message ?? e); process.exit(1); });
