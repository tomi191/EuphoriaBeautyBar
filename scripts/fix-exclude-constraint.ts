/**
 * P0 fix: bookings_no_overlap EXCLUDE constraint липсва status филтъра → отменени
 * (cancelled/no_show) часове остават в GiST индекса и блокират слота на DB ниво
 * (фалшиво „този час е зает" за слот, който app-ът показва свободен).
 * Добавя `AND status NOT IN ('cancelled','no_show')`. Атомарно (BEGIN/COMMIT).
 * Новият constraint е ПО-РАЗХЛАБЕН → ADD винаги минава.
 * Пускане: npx tsx --env-file=.env.local scripts/fix-exclude-constraint.ts
 */
import { sql } from "drizzle-orm";
import { db } from "../src/lib/db";

async function main() {
  const before: any = await db.execute(sql`SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = 'bookings_no_overlap'`);
  console.log("ПРЕДИ:", (before.rows ?? before)[0]?.def ?? "(няма)");

  await db.transaction(async (tx) => {
    await tx.execute(sql`ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_no_overlap`);
    await tx.execute(sql`ALTER TABLE bookings ADD CONSTRAINT bookings_no_overlap EXCLUDE USING gist (resource_id WITH =, tstzrange(start_at, end_at) WITH &&) WHERE (allow_parallel = false AND status NOT IN ('cancelled', 'no_show'))`);
  });

  const after: any = await db.execute(sql`SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = 'bookings_no_overlap'`);
  console.log("СЛЕД: ", (after.rows ?? after)[0]?.def ?? "(няма)");
  console.log("\n✅ Constraint обновен — отменените часове вече не блокират слотове.");
  process.exit(0);
}

main().catch((e) => { console.error("✗", e.message ?? e); process.exit(1); });
