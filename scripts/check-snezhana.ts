/**
 * Read-only диагностика: защо изпълнител не може да записва часове на дадена дата.
 * Пускане: npx tsx --env-file=.env.local scripts/check-snezhana.ts 2026-06-25
 */
import { db } from "../src/lib/db";
import { sofiaWeekday, sofiaWallToUtc, sofiaTimeLabel } from "../src/lib/booking/time";
import { getClosedDates } from "../src/lib/booking/closures";

const DATE = process.argv[2] ?? "2026-06-25";
const WD_BG = ["неделя", "понеделник", "вторник", "сряда", "четвъртък", "петък", "събота"];

async function main() {
  const wd = sofiaWeekday(DATE);
  console.log(`\n📅 Дата: ${DATE} — ${WD_BG[wd]} (weekday=${wd})\n`);

  // 1. Затворени дни
  const closed = await getClosedDates();
  console.log(`🔒 Closures (salon_closures): ${JSON.stringify(closed)}`);
  console.log(`   → ${DATE} затворен? ${closed.includes(DATE) ? "ДА ❌" : "не"}\n`);

  // 2. Намери Снежана сред ресурсите
  const resources = await db.query.resources.findMany();
  console.log(`👥 Ресурси (${resources.length}):`);
  for (const r of resources) {
    const name = (r as Record<string, unknown>).name ?? (r as Record<string, unknown>).displayName ?? "?";
    console.log(`   - ${name} | kind=${(r as Record<string, unknown>).kind} | active=${(r as Record<string, unknown>).active} | id=${r.id}`);
  }
  const sn = resources.find((r) => /снежан/i.test(JSON.stringify(r)));
  if (!sn) { console.log("\n⚠️ Снежана не е намерена по име — провери ръчно горе.\n"); }
  const snId = sn?.id;
  console.log(`\n→ Снежана id: ${snId ?? "?"}\n`);

  // 3. Салонно работно време за този weekday
  const salonWh = await db.query.workingHours.findFirst({ where: (w, { eq }) => eq(w.weekday, wd) });
  console.log(`🏢 Салонно работно време (${WD_BG[wd]}): ${salonWh ? JSON.stringify(salonWh) : "няма ред"}`);

  // 4. Собствено работно време на Снежана (всички дни + конкретния)
  if (snId) {
    const ownAll = await db.query.resourceWorkingHours.findMany({ where: (w, { eq }) => eq(w.resourceId, snId) });
    console.log(`\n👤 Собствено работно време на Снежана (${ownAll.length} реда):`);
    for (const w of ownAll) {
      const ww = w as Record<string, unknown>;
      console.log(`   - ${WD_BG[Number(ww.weekday)]}(${ww.weekday}): open=${ww.openTime} close=${ww.closeTime} closed=${ww.closed}`);
    }
    const ownWd = ownAll.find((w) => (w as Record<string, unknown>).weekday === wd);
    console.log(`\n   → За ${WD_BG[wd]}: ${ownWd ? JSON.stringify(ownWd) : "НЯМА собствен ред → пада към салонното"}`);
    const effective = ownWd ?? salonWh;
    const ew = effective as Record<string, unknown> | undefined;
    const dayOff = !ew || ew.closed || !ew.openTime || !ew.closeTime;
    console.log(`   → ЕФЕКТИВНО за деня: ${dayOff ? "ЗАТВОРЕНО/без часове ❌" : `${ew!.openTime}–${ew!.closeTime} ✅`}\n`);
  }

  // 5. Time-off (отпуск/почивка) покриващ деня
  const dayStart = sofiaWallToUtc(DATE, "00:00");
  const dayEnd = new Date(dayStart.getTime() + 24 * 3600000);
  const offs = await db.query.timeOff.findMany({
    where: (t, { and, lt, gt }) => and(lt(t.startAt, dayEnd), gt(t.endAt, dayStart)),
  });
  console.log(`🌴 Time-off засягащ ${DATE} (${offs.length}):`);
  for (const o of offs) {
    const oo = o as Record<string, unknown>;
    const scope = oo.resourceId == null ? "ЦЯЛ САЛОН" : oo.resourceId === snId ? "СНЕЖАНА" : `друг (${oo.resourceId})`;
    console.log(`   - ${scope} | ${sofiaTimeLabel(o.startAt)}–${sofiaTimeLabel(o.endAt)} | ${(o.startAt as Date).toISOString()} → ${(o.endAt as Date).toISOString()} | reason=${oo.reason ?? "-"}`);
  }
  console.log("");

  // 6. Bookings на Снежана за деня
  if (snId) {
    const bks = await db.query.bookings.findMany({
      where: (b, { and, eq, gte, lt }) => and(eq(b.resourceId, snId), gte(b.startAt, dayStart), lt(b.startAt, dayEnd)),
    });
    console.log(`📖 Bookings на Снежана за ${DATE} (${bks.length}):`);
    for (const b of bks) {
      console.log(`   - ${sofiaTimeLabel(b.startAt)}–${sofiaTimeLabel(b.endAt)} | status=${(b as Record<string, unknown>).status}`);
    }
  }
  console.log("\n✅ Диагностиката приключи.\n");
  process.exit(0);
}

main().catch((e) => { console.error("✗", e.message ?? e); process.exit(1); });
