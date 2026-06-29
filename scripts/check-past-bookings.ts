/* eslint-disable no-console */
/** Read-only: разпределение на bookings по ресурс (минало/днес+бъдеще) + примери от миналото.
 *  Пускане: npx tsx scripts/check-past-bookings.ts */
import "./load-env";
import { db } from "../src/lib/db";
import { sofiaDateStr, sofiaWallToUtc, sofiaTimeLabel } from "../src/lib/booking/time";

async function main() {
  const now = new Date();
  const todayKey = sofiaDateStr(now);
  const todayStart = sofiaWallToUtc(todayKey, "00:00");
  console.log(`\n📅 Днес (Sofia): ${todayKey} · UTC граница: ${todayStart.toISOString()}\n`);

  const resources = await db.query.resources.findMany();
  for (const r of resources) {
    const all = await db.query.bookings.findMany({
      where: (b, { eq }) => eq(b.resourceId, r.id),
      orderBy: (b, { asc }) => [asc(b.startAt)],
    });
    if (all.length === 0) {
      console.log(`— ${r.name} (${r.kind}): 0 записа изобщо`);
      continue;
    }
    const past = all.filter((b) => b.startAt.getTime() < todayStart.getTime());
    const future = all.filter((b) => b.startAt.getTime() >= todayStart.getTime());
    const byStatus: Record<string, number> = {};
    for (const b of past) byStatus[b.status] = (byStatus[b.status] ?? 0) + 1;
    console.log(`=== ${r.name} (${r.kind}) — общо ${all.length}: МИНАЛИ ${past.length}, днес+бъдещи ${future.length} ===`);
    if (past.length) {
      console.log(`   минали по статус: ${JSON.stringify(byStatus)}`);
      console.log(`   последни 6 минали:`);
      for (const b of past.slice(-6)) {
        console.log(`     • ${sofiaDateStr(b.startAt)} ${sofiaTimeLabel(b.startAt)} | ${b.status} | ${b.serviceName}`);
      }
    }
    console.log("");
  }
  process.exit(0);
}
main().catch((e) => { console.error("✗", e?.message ?? e); process.exit(1); });
