/* eslint-disable no-console */
/** Idempotent миграция: добавя telegram колони на resources (nullable → безопасно, не трие).
 *  НЕ db:push (gotcha с truncate). Пускане: npx tsx scripts/migrate-telegram-cols.ts */
import "./load-env";
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("✗ DATABASE_URL липсва");
    process.exit(1);
  }
  const sql = postgres(url, { prepare: false });
  await sql`ALTER TABLE resources ADD COLUMN IF NOT EXISTS telegram_chat_id text`;
  await sql`ALTER TABLE resources ADD COLUMN IF NOT EXISTS telegram_link_token text`;
  const cols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'resources' AND column_name LIKE 'telegram%'
    ORDER BY column_name`;
  console.log("✅ telegram колони на resources:", cols.map((c) => c.column_name).join(", "));
  await sql.end();
  process.exit(0);
}
main().catch((e) => {
  console.error("✗", e?.message ?? e);
  process.exit(1);
});
