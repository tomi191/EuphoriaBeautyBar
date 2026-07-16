/* eslint-disable no-console */
/** Диагностика: notify_log на последните записи + admin telegram настройка.
 * Пускане: npx tsx --env-file=.env.local scripts/diag-notify-log.ts */
import { desc, eq } from "drizzle-orm";
import { db, schema } from "../src/lib/db";

async function main() {
  const rows = await db.query.bookings.findMany({
    orderBy: (b) => desc(b.createdAt),
    limit: 12,
  });
  for (const b of rows) {
    console.log(
      `${b.createdAt.toISOString()} | start ${b.startAt.toISOString()} | ${b.status} | source: ${b.source ?? "?"} | notify:`,
      JSON.stringify(b.notifyLog),
    );
  }
  const s = await db.query.siteSettings.findFirst({ where: eq(schema.siteSettings.key, "admin_telegram") });
  console.log("\nadmin_telegram setting:", s ? JSON.stringify(s.value).slice(0, 120) : "НЯМА");
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
