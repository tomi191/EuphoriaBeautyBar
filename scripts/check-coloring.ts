/**
 * Read-only: дали боядисването поддържа паралелна работа (active/processing) и
 * дали сценарият "17:30 боядисване host + 18:00 паралелно" се събира.
 * Пускане: npx tsx --env-file=.env.local scripts/check-coloring.ts
 */
import { db } from "../src/lib/db";
import { windowFor, fitsParallelWindow } from "../src/lib/booking/parallel";
import { sofiaWallToUtc, sofiaTimeLabel } from "../src/lib/booking/time";

const RES = "res-snezhana";
const DATE = "2026-06-25";
const lbl = (ms: number) => sofiaTimeLabel(new Date(ms));

async function main() {
  // 1. Боядисване услуги в каталога — durationMin/activeMin/processingMin/bufferMin
  const items = await db.query.serviceItems.findMany();
  const coloring = items.filter((i) => /боядис|балаяж|цвят|кичур/i.test((i as Record<string, unknown>).name as string));
  console.log(`\n🎨 Цветни услуги (serviceItems):`);
  for (const c of coloring) {
    const cc = c as Record<string, unknown>;
    console.log(`   - ${cc.name}: duration=${cc.durationMin} active=${cc.activeMin} processing=${cc.processingMin} buffer=${cc.bufferMin}`);
  }

  // 2. Снежана own offerings (resource_services) за тези услуги
  const rs = await db.query.resourceServices.findMany({ where: (r, { eq }) => eq(r.resourceId, RES) });
  console.log(`\n👤 Снежана resource_services (${rs.length}) — цветни:`);
  for (const r of rs) {
    const rr = r as Record<string, unknown>;
    const item = coloring.find((c) => c.id === rr.serviceItemId);
    if (item) console.log(`   - ${(item as Record<string, unknown>).name}: own duration=${rr.durationMin} active=${rr.activeMin ?? "—"} processing=${rr.processingMin ?? "—"} buffer=${rr.bufferMin}`);
  }

  // 3. Симулация: A=боядисване в 17:30 host. Какъв е parallel window?
  const A = coloring.find((c) => /^боядисване$/i.test((c as Record<string, unknown>).name as string)) ?? coloring[0];
  const ac = A as Record<string, unknown> | undefined;
  console.log(`\n🧪 Симулация: host боядисване "${ac?.name}" в 17:30 на ${DATE}`);
  const start = sofiaWallToUtc(DATE, "17:30").getTime();
  const activeMin = (ac?.activeMin as number) ?? 0;
  const processingMin = (ac?.processingMin as number) ?? 0;
  console.log(`   active=${activeMin} processing=${processingMin}`);
  const w = windowFor(start, activeMin, processingMin);
  if (!w) {
    console.log(`   → windowFor = NULL ❌  (processing ≤ 10 мин → НЯМА паралелен прозорец)`);
    console.log(`   → Дори да включим allowParallel в staff формата, паралел НЯМА да е възможен,`);
    console.log(`     защото услугата няма processing време. Трябва active/processing на услугата.`);
  } else {
    console.log(`   → parallel window: ${lbl(w.start)} – ${lbl(w.end)} ✅`);
    // Дали 18:00 паралелно (active min) се събира?
    const pStart = sofiaWallToUtc(DATE, "18:00");
    const pEnd = new Date(pStart.getTime() + activeMin * 60000);
    console.log(`   → 18:00 паралелно (${activeMin}мин active → ${lbl(pStart.getTime())}–${lbl(pEnd.getTime())}): в прозореца? ${pStart.getTime() >= w.start && pEnd.getTime() <= w.end ? "ДА ✅" : "НЕ ❌"}`);
  }

  // 4. Какво има реално записано на 25-ти (за да видим host candidates)
  const dayStart = sofiaWallToUtc(DATE, "00:00");
  const dayEnd = new Date(dayStart.getTime() + 24 * 3600000);
  const bks = await db.query.bookings.findMany({
    where: (b, { and, eq, gte, lt }) => and(eq(b.resourceId, RES), gte(b.startAt, dayStart), lt(b.startAt, dayEnd)),
  });
  console.log(`\n📖 Bookings на 25-ти (${bks.length}):`);
  for (const b of bks) {
    const bb = b as Record<string, unknown>;
    console.log(`   - ${lbl(b.startAt.getTime())}–${lbl(b.endAt.getTime())} | ${bb.serviceName} | active=${bb.activeMin} proc=${bb.processingMin} parallel=${bb.allowParallel} status=${bb.status}`);
  }
  console.log("");
  process.exit(0);
}

main().catch((e) => { console.error("✗", e.message ?? e); process.exit(1); });
