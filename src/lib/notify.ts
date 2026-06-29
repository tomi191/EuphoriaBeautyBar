import { sendPushToResource } from "@/lib/push";
import { sendTelegramToResource, type InlineKeyboard } from "@/lib/telegram";
import { sofiaDateStr } from "@/lib/booking/time";

export interface NotifyPayload {
  title: string;
  body: string;
  url?: string;
  clientPhone?: string; // показва се като кликаем телефон в Telegram
  dateKey?: string; // ден на записа (YYYY-MM-DD) — бутонът „Виж графика" отваря точно него
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function digits(p: string): string {
  const t = p.trim();
  return (t.startsWith("+") ? "+" : "") + t.replace(/\D/g, "");
}

/**
 * Известява изпълнителя по ВСИЧКИ канали (web push + Telegram), паралелно. Не хвърля, не
 * блокира. Telegram съобщението е по-богато (кликаем телефон + бутон към дневния график);
 * push остава кратко. Единствена точка за известия към изпълнител.
 */
export async function notifyResource(resourceId: string, payload: NotifyPayload): Promise<void> {
  const lines = [`<b>${escapeHtml(payload.title)}</b>`, escapeHtml(payload.body)];
  if (payload.clientPhone) {
    lines.push(`📞 <a href="tel:${digits(payload.clientPhone)}">${escapeHtml(payload.clientPhone)}</a>`);
  }
  const day = payload.dateKey ?? sofiaDateStr(new Date());
  const keyboard: InlineKeyboard = { inline_keyboard: [[{ text: "📅 Виж графика", callback_data: `day:${day}` }]] };

  await Promise.allSettled([
    sendPushToResource(resourceId, { title: payload.title, body: payload.body, url: payload.url }),
    sendTelegramToResource(resourceId, lines.join("\n"), keyboard),
  ]);
}
