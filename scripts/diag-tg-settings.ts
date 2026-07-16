/* eslint-disable no-console */
/** Диагностика: Telegram настройки в siteSettings (верните ключове).
 * Пускане: npx tsx --env-file=.env.local scripts/diag-tg-settings.ts */
import { db } from "../src/lib/db";

async function main() {
  const rows = await db.query.siteSettings.findMany();
  for (const r of rows) {
    const v = JSON.stringify(r.value) ?? "";
    console.log(`${r.key} = ${v.length > 100 ? v.slice(0, 100) + "…" : v}`);
  }
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
