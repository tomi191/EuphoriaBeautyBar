/* eslint-disable no-console */
/** Telegram помощен CLI.
 *  npx tsx scripts/tg.ts getUpdates                    — кой е писал на бота (chat_id)
 *  npx tsx scripts/tg.ts webhookinfo                   — текущ webhook
 *  npx tsx scripts/tg.ts setWebhook <https-url>        — задай webhook (+ secret)
 *  npx tsx scripts/tg.ts deleteWebhook                 — махни webhook (за getUpdates)
 *  npx tsx scripts/tg.ts send <chatId> <text...>       — прати съобщение
 *  npx tsx scripts/tg.ts link <resourceId> <chatId>    — свържи изпълнител с chat (ръчно) */
import "./load-env";
import { eq } from "drizzle-orm";
import { db, schema } from "../src/lib/db";

const token = process.env.TELEGRAM_BOT_TOKEN;
const API = `https://api.telegram.org/bot${token}`;
const cmd = process.argv[2];

async function tg(method: string, body?: unknown) {
  const r = await fetch(`${API}/${method}`, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {});
  return r.json();
}

async function main() {
  if (!token) {
    console.error("✗ TELEGRAM_BOT_TOKEN липсва");
    process.exit(1);
  }
  switch (cmd) {
    case "getUpdates":
      console.log(JSON.stringify(await tg("getUpdates"), null, 2));
      break;
    case "webhookinfo":
      console.log(JSON.stringify(await tg("getWebhookInfo"), null, 2));
      break;
    case "setWebhook":
      console.log(JSON.stringify(await tg("setWebhook", { url: process.argv[3], secret_token: process.env.TELEGRAM_WEBHOOK_SECRET, allowed_updates: ["message", "callback_query"] }), null, 2));
      break;
    case "deleteWebhook":
      console.log(JSON.stringify(await tg("deleteWebhook"), null, 2));
      break;
    case "setCommands":
      console.log(JSON.stringify(await tg("setMyCommands", { commands: [{ command: "today", description: "Днешен график" }] }), null, 2));
      break;
    case "send":
      console.log(JSON.stringify(await tg("sendMessage", { chat_id: process.argv[3], text: process.argv.slice(4).join(" "), parse_mode: "HTML" }), null, 2));
      break;
    case "link": {
      const resourceId = process.argv[3];
      const chatId = process.argv[4];
      await db.update(schema.resources).set({ telegramChatId: chatId }).where(eq(schema.resources.id, resourceId));
      console.log(`✅ ${resourceId} → chat ${chatId}`);
      break;
    }
    default:
      console.log("команди: getUpdates | webhookinfo | setWebhook <url> | deleteWebhook | send <chatId> <text> | link <resourceId> <chatId>");
  }
  process.exit(0);
}
main().catch((e) => {
  console.error("✗", e?.message ?? e);
  process.exit(1);
});
