/* eslint-disable no-console */
/** Тества пълния notifyResource flow (push + Telegram) към изпълнител.
 *  Пускане: npx tsx scripts/test-notify.ts [resourceId] */
import "./load-env";
import { notifyResource } from "../src/lib/notify";

const resourceId = process.argv[2] ?? "res-snezhana";

async function main() {
  await notifyResource(resourceId, {
    title: "Нов запис (тест)",
    body: "Дамско подстригване — днес 15:00 (Мария)",
    url: "/staff",
  });
  console.log(`✅ notifyResource(${resourceId}) извикан — push (тихо, ако няма) + Telegram.`);
  process.exit(0);
}
main().catch((e) => {
  console.error("✗", e?.message ?? e);
  process.exit(1);
});
