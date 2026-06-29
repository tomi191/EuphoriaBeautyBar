/**
 * P1 fix: два конкурентни паралелни INSERT (allow_parallel=true) в един прозорец
 * минават app-проверката (TOCTOU) и EXCLUDE не ги покрива (partial WHERE
 * allow_parallel=false). Добавя UNIQUE индекс за (resource_id, start_at) на
 * паралелните → два с еднакъв старт не могат да съсъществуват на DB ниво.
 * Пускане: npx tsx --env-file=.env.local scripts/fix-parallel-race-index.ts
 */
import { sql } from "drizzle-orm";
import { db } from "../src/lib/db";

async function main() {
  // Провери за съществуващи дубли (иначе CREATE UNIQUE гърми).
  const dupes: any = await db.execute(sql`
    SELECT resource_id, start_at, count(*) AS n FROM bookings
    WHERE allow_parallel = true AND status NOT IN ('cancelled', 'no_show')
    GROUP BY resource_id, start_at HAVING count(*) > 1`);
  const dupRows = dupes.rows ?? dupes;
  if (dupRows.length) {
    console.log("⚠️  Има дублирани паралелни (resource_id, start_at) — изчисти ги ръчно първо:");
    for (const d of dupRows) console.log(`   ${d.resource_id} @ ${d.start_at}: ${d.n}`);
    process.exit(1);
  }

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS bookings_parallel_start_uniq
      ON bookings (resource_id, start_at)
      WHERE allow_parallel = true AND status NOT IN ('cancelled', 'no_show')`);

  const idx: any = await db.execute(sql`SELECT indexdef FROM pg_indexes WHERE indexname = 'bookings_parallel_start_uniq'`);
  console.log("✅ Индекс:", (idx.rows ?? idx)[0]?.indexdef ?? "(няма)");
  process.exit(0);
}

main().catch((e) => { console.error("✗", e.message ?? e); process.exit(1); });
