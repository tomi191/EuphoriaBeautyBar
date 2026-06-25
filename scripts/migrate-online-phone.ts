/**
 * Migration: добавя resources.phone + resource_services.online_bookable.
 * Idempotent (IF NOT EXISTS). Пускане: npx tsx --env-file=.env.local scripts/migrate-online-phone.ts
 */
import { sql } from "drizzle-orm";
import { db } from "../src/lib/db";

async function main() {
  await db.execute(sql`ALTER TABLE resources ADD COLUMN IF NOT EXISTS phone text`);
  console.log("✓ resources.phone");
  await db.execute(sql`ALTER TABLE resource_services ADD COLUMN IF NOT EXISTS online_bookable boolean NOT NULL DEFAULT true`);
  console.log("✓ resource_services.online_bookable (default true)");
  console.log("\n✅ Migration приложен.");
  process.exit(0);
}
main().catch((e) => { console.error("✗", e?.message ?? e); process.exit(1); });
