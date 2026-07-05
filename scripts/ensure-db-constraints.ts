/**
 * КАНОНИЧЕН източник за DB constraint-ите, които Drizzle DSL не може да изрази
 * (EXCLUDE/GiST, частични UNIQUE) → НЕ идват от `db:push`/schema.ts. Пусни СЛЕД
 * `db:push` на всяка нова среда (иначе базата няма race защита на DB ниво).
 * Идемпотентен: безопасно за повторно пускане.
 *
 * Пускане: npx tsx --env-file=.env.local scripts/ensure-db-constraints.ts
 *
 * Забележка: приложението има и app-level guard (hasActiveConflict в
 * @/lib/booking/slots) — тези constraint-и са вторият слой (TOCTOU/конкурентност).
 */
import { sql } from "drizzle-orm";
import { db } from "../src/lib/db";

async function main() {
  // 1) btree_gist — нужно за EXCLUDE с равенство по resource_id + range по времето.
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS btree_gist`);

  // 2) Непаралелни часове на един изпълнител не се застъпват (отменените/неявили се
  //    са изключени, за да не блокират слота). Партициониран по allow_parallel=false.
  await db.transaction(async (tx) => {
    await tx.execute(sql`ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_no_overlap`);
    await tx.execute(sql`
      ALTER TABLE bookings ADD CONSTRAINT bookings_no_overlap
        EXCLUDE USING gist (resource_id WITH =, tstzrange(start_at, end_at) WITH &&)
        WHERE (allow_parallel = false AND status NOT IN ('cancelled', 'no_show'))`);
  });

  // 3) Два конкурентни паралелни INSERT с еднакъв старт не могат да съсъществуват
  //    (EXCLUDE-ът по-горе не покрива allow_parallel=true — TOCTOU защита).
  const dupes = (await db.execute(sql`
    SELECT resource_id, start_at, count(*) AS n FROM bookings
    WHERE allow_parallel = true AND status NOT IN ('cancelled', 'no_show')
    GROUP BY resource_id, start_at HAVING count(*) > 1`)) as unknown as { rows?: unknown[] };
  const dupRows = (dupes.rows ?? (dupes as unknown as unknown[])) as unknown[];
  if (dupRows.length) {
    console.error("⚠️  Има дублирани паралелни (resource_id, start_at) — изчисти ги преди CREATE UNIQUE.");
    process.exit(1);
  }
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS bookings_parallel_start_uniq
      ON bookings (resource_id, start_at)
      WHERE allow_parallel = true AND status NOT IN ('cancelled', 'no_show')`);

  console.log("✅ DB constraint-ите са налични (btree_gist, bookings_no_overlap, bookings_parallel_start_uniq).");
  process.exit(0);
}

main().catch((e) => { console.error("✗", (e as Error)?.message ?? e); process.exit(1); });
