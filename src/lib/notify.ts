import { sendPushToResource } from "@/lib/push";
import { sendTelegramToResource, sendTelegramToAdmin, type InlineKeyboard } from "@/lib/telegram";
import { sofiaDateStr } from "@/lib/booking/time";
import { siteConfig } from "@/lib/site";

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

export interface NotifyResult {
  push: { sent: number; failed: number };
  telegram: boolean;
}

/**
 * Известява изпълнителя по ВСИЧКИ канали (web push + Telegram), паралелно. Не хвърля, не
 * блокира. Telegram съобщението е по-богато (кликаем телефон + бутон към дневния график);
 * push остава кратко. Единствена точка за известия към изпълнител. Връща резултата по
 * канал — повикващият може да го запише (bookings.notify_log) за диагностика.
 */
export async function notifyResource(resourceId: string, payload: NotifyPayload): Promise<NotifyResult> {
  const lines = [`<b>${escapeHtml(payload.title)}</b>`, escapeHtml(payload.body)];
  if (payload.clientPhone) {
    lines.push(`📞 <a href="tel:${digits(payload.clientPhone)}">${escapeHtml(payload.clientPhone)}</a>`);
  }
  const day = payload.dateKey ?? sofiaDateStr(new Date());
  const keyboard: InlineKeyboard = { inline_keyboard: [[{ text: "📅 Виж графика", callback_data: `day:${day}` }]] };

  const [pushRes, tgRes] = await Promise.allSettled([
    sendPushToResource(resourceId, { title: payload.title, body: payload.body, url: payload.url }),
    sendTelegramToResource(resourceId, lines.join("\n"), keyboard),
  ]);
  return {
    push: pushRes.status === "fulfilled" ? pushRes.value : { sent: 0, failed: 0 },
    telegram: tgRes.status === "fulfilled" ? tgRes.value : false,
  };
}

/**
 * Известява АДМИН Telegram канала (собственика) — за всички онлайн записи/откази,
 * независимо при кой изпълнител. Бутонът е URL към админ графика за деня (callback
 * day:* работи само за изпълнителски чатове). Не хвърля.
 */
export async function notifyAdmin(payload: NotifyPayload & { performerName?: string }): Promise<boolean> {
  const lines = [`<b>${escapeHtml(payload.title)}</b>`, escapeHtml(payload.body)];
  if (payload.performerName) lines.push(`👤 при ${escapeHtml(payload.performerName)}`);
  if (payload.clientPhone) {
    lines.push(`📞 <a href="tel:${digits(payload.clientPhone)}">${escapeHtml(payload.clientPhone)}</a>`);
  }
  const day = payload.dateKey ?? sofiaDateStr(new Date());
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? siteConfig.url;
  const keyboard: InlineKeyboard = {
    inline_keyboard: [[{ text: "📅 Отвори графика", url: `${base}/admin/bookings?date=${day}` }]],
  };
  return sendTelegramToAdmin(lines.join("\n"), keyboard).catch(() => false);
}
