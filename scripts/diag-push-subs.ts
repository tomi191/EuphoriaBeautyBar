/* eslint-disable no-console */
/** Диагностика: push абонаменти + свързаност към изпълнители.
 * Пускане: npx tsx --env-file=.env.local scripts/diag-push-subs.ts */
import { db } from "../src/lib/db";

async function main() {
  const subs = await db.query.pushSubscriptions.findMany();
  console.log(`Push абонаменти: ${subs.length}`);
  for (const s of subs) {
    const host = (() => { try { return new URL(s.endpoint).host; } catch { return "?"; } })();
    console.log(`  ${host} | resource: ${s.resourceId ?? "NULL"} | created: ${s.createdAt.toISOString()} | …${s.endpoint.slice(-10)}`);
  }
  const resources = await db.query.resources.findMany();
  console.log(`\nИзпълнители: ${resources.length}`);
  for (const r of resources) {
    const cnt = subs.filter((s) => s.resourceId === r.id).length;
    console.log(`  ${r.name} (${r.id}) | активен: ${r.active} | telegram: ${r.telegramChatId ? "да" : "—"} | push устройства: ${cnt}`);
  }
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
