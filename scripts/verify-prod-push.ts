/* eslint-disable no-console */
/** Тества PROD push pipeline: вика живия evening-digest cron с CRON_SECRET.
 *  Изпълнителите с часове УТРЕ получават реален „Утрешен график" push от production
 *  (= същият sendPushToResource път като при нов запис, но без да създава booking).
 *  Пускане: npx tsx scripts/verify-prod-push.ts */
import "./load-env";

const ORIGIN = "https://www.euphoriabeauty.eu";
const secret = process.env.CRON_SECRET;

async function main() {
  if (!secret) {
    console.error("✗ Липсва CRON_SECRET в .env.local");
    process.exit(1);
  }
  const url = `${ORIGIN}/api/cron/evening-digest`;
  console.log(`POST ${url}\n`);
  const r = await fetch(url, { headers: { Authorization: `Bearer ${secret}` } });
  console.log(`HTTP ${r.status} ${r.statusText}`);
  console.log("Отговор:", await r.text());
  console.log(
    "\nINFO: notified брои ОПИТИ (sendPushToResource не хвърля). Истинският сигнал е дали Снежана получи известие на телефона.",
  );
  process.exit(r.ok ? 0 : 1);
}
main().catch((e) => {
  console.error("✗", e?.message ?? e);
  process.exit(1);
});
