/** Кои изпълнители са свързани с Telegram бота. */
import { db } from "../src/lib/db";

async function main() {
  const rs = await db.query.resources.findMany({
    columns: { id: true, name: true, kind: true, telegramChatId: true, active: true },
  });
  for (const r of rs) console.log(`${r.active ? "✓" : "✗"} ${r.name} (${r.kind}, ${r.id}) — telegram: ${r.telegramChatId ?? "НЕ"}`);
  process.exit(0);
}
main().catch((e) => { console.error("✗", e?.message ?? e); process.exit(1); });
