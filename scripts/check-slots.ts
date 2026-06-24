/**
 * Read-only: симулира staff slot изчислението (getDaySlots, minNotice=0) за Снежана
 * с различни продължителности, за да види кога слотовете излизат free vs busy/past.
 * Пускане: npx tsx --env-file=.env.local scripts/check-slots.ts 2026-06-25
 */
import { getDaySlots } from "../src/lib/booking/slots";
import { db } from "../src/lib/db";
import { sofiaTimeLabel } from "../src/lib/booking/time";

const DATE = process.argv[2] ?? "2026-06-25";
const RES = "res-snezhana";
const lbl = (iso: string) => sofiaTimeLabel(new Date(iso));

async function main() {
  console.log(`\n⏰ Системно now: ${new Date().toISOString()}  (Sofia: ${sofiaTimeLabel(new Date())})`);
  console.log(`📅 Дата: ${DATE}\n`);

  // Реалните услуги на Снежана + продължителности
  const rs = await db.query.resourceServices.findMany({ where: (r, { eq }) => eq(r.resourceId, RES) });
  console.log(`🧾 resource_services за Снежана: ${rs.length} реда`);
  const durations = [...new Set(rs.map((r) => (r as Record<string, unknown>).durationMin as number).filter(Boolean))].sort((a, b) => a - b);
  console.log(`   уникални продължителности: ${durations.length ? durations.join(", ") : "(няма own offerings → каталожни)"}\n`);

  const testDurations = durations.length ? durations : [30, 45, 60, 120, 195];

  for (const durationMin of testDurations) {
    const res = await getDaySlots({ resourceId: RES, durationMin, bufferMin: 10, dateStr: DATE, minNoticeMin: 0 });
    if (!res) {
      console.log(`dur=${durationMin}+10 → getDaySlots = null (затворено/без работно време)`);
      continue;
    }
    const free = res.slots.filter((s) => s.status === "free");
    const busy = res.slots.filter((s) => s.status === "busy");
    const past = res.slots.filter((s) => s.status === "past");
    console.log(`dur=${durationMin}+10мин | open=${lbl(res.open)} close=${lbl(res.close)} | общо=${res.slots.length} · FREE=${free.length} · busy=${busy.length} · past=${past.length}`);
    console.log(`   free часове: ${free.length ? free.map((s) => lbl(s.start)).join(", ") : "❌ НЯМА"}`);
  }
  console.log("");
  process.exit(0);
}

main().catch((e) => { console.error("✗", e.message ?? e); process.exit(1); });
