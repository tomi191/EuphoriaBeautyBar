/* eslint-disable no-console */
/** Тест: праща дневния график на изпълнител в Telegram (формат + навигационни бутони).
 *  npx tsx scripts/test-schedule.ts [chatId] [YYYY-MM-DD] */
import "./load-env";
import { buildDaySchedule } from "../src/lib/telegram-schedule";
import { sendTelegram } from "../src/lib/telegram";
import { sofiaDateStr } from "../src/lib/booking/time";

async function main() {
  const chatId = process.argv[2] ?? "6196363031"; // Снежана
  const dateKey = process.argv[3] ?? sofiaDateStr(new Date());
  const { text, keyboard } = await buildDaySchedule("res-snezhana", dateKey);
  console.log("--- ТЕКСТ ---\n" + text + "\n-------------");
  const ok = await sendTelegram(chatId, text, keyboard);
  console.log(ok ? "✅ изпратено до Telegram (бутоните оживяват след webhook setup)" : "✗ провал");
  process.exit(0);
}
main().catch((e) => {
  console.error("✗", e?.message ?? e);
  process.exit(1);
});
