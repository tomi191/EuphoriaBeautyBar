/** Еднократна DDL: bookings.notify_log jsonb (резултат от известията при създаване). */
import { sql } from "drizzle-orm";
import { db } from "../src/lib/db";

async function main() {
  await db.execute(sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS notify_log jsonb`);
  const check = await db.execute(
    sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'notify_log'`,
  );
  console.log(check.length ? "✅ bookings.notify_log е налична" : "✗ колоната липсва след ALTER?!");
  process.exit(0);
}
main().catch((e) => { console.error("✗", e?.message ?? e); process.exit(1); });
