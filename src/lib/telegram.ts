import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

const API = "https://api.telegram.org";

export type InlineButton = { text: string; callback_data?: string; url?: string };
export type InlineKeyboard = { inline_keyboard: InlineButton[][] };

async function call(method: string, body: Record<string, unknown>): Promise<Response | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn("[telegram] TELEGRAM_BOT_TOKEN липсва — %s се пропуска", method);
    return null;
  }
  try {
    return await fetch(`${API}/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.warn("[telegram] %s грешка:", method, e instanceof Error ? e.message : String(e));
    return null;
  }
}

/** Изпраща Telegram съобщение (опц. inline бутони). Без token → тихо пропуска. Не хвърля. */
export async function sendTelegram(chatId: string | number, text: string, keyboard?: InlineKeyboard): Promise<boolean> {
  if (!chatId) return false;
  const body: Record<string, unknown> = { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true };
  if (keyboard) body.reply_markup = keyboard;
  const r = await call("sendMessage", body);
  if (!r) return false;
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    // 403 = ботът е спрян/блокиран → разсвържи, за да не пращаме напразно.
    if (r.status === 403) {
      try {
        await db.update(schema.resources).set({ telegramChatId: null }).where(eq(schema.resources.telegramChatId, String(chatId)));
      } catch {
        /* best-effort */
      }
    }
    console.warn("[telegram] sendMessage провал %s: %s", r.status, t.slice(0, 200));
    return false;
  }
  return true;
}

/** Редактира съществуващо съобщение (за inline навигация по callback). Не хвърля. */
export async function editMessageText(chatId: string | number, messageId: number, text: string, keyboard?: InlineKeyboard): Promise<boolean> {
  const body: Record<string, unknown> = { chat_id: chatId, message_id: messageId, text, parse_mode: "HTML", disable_web_page_preview: true };
  if (keyboard) body.reply_markup = keyboard;
  const r = await call("editMessageText", body);
  return !!r && r.ok;
}

/** Затваря „часовника" на inline бутон (иначе клиентът вижда зареждане). Не хвърля. */
export async function answerCallback(callbackId: string, text?: string): Promise<void> {
  await call("answerCallbackQuery", { callback_query_id: callbackId, ...(text ? { text } : {}) });
}

/** Изпраща до Telegram chat-а на изпълнител (ако е свързан). Не хвърля. */
export async function sendTelegramToResource(resourceId: string, text: string, keyboard?: InlineKeyboard): Promise<boolean> {
  const res = await db.query.resources.findFirst({ where: (r, { eq: e }) => e(r.id, resourceId) });
  if (!res?.telegramChatId) return false;
  return sendTelegram(res.telegramChatId, text, keyboard);
}

/** Намира изпълнителя по свързан Telegram chat (за командите /today и callback навигацията). */
export async function findResourceByChatId(chatId: string | number) {
  return db.query.resources.findFirst({ where: (r, { eq: e }) => e(r.telegramChatId, String(chatId)) });
}

// ── Админ канал (собственикът получава ВСИЧКИ нови онлайн записи/откази) ──
export const ADMIN_CHAT_KEY = "telegram_admin_chat_id";
export const ADMIN_LINK_TOKEN_KEY = "telegram_admin_link_token";

/** Chat ID на админ канала от siteSettings (null = несвързан). */
export async function getAdminChatId(): Promise<string | null> {
  const row = await db.query.siteSettings.findFirst({ where: (s, { eq: e }) => e(s.key, ADMIN_CHAT_KEY) });
  return (row?.value as { chatId?: string } | undefined)?.chatId ?? null;
}

/**
 * Изпраща до админ канала (ако е свързан). Не хвърля. При спрян бот (403) chat id-то
 * остава в siteSettings — повторното свързване през deep link просто го пренаписва.
 */
export async function sendTelegramToAdmin(text: string, keyboard?: InlineKeyboard): Promise<boolean> {
  const chatId = await getAdminChatId();
  if (!chatId) return false;
  return sendTelegram(chatId, text, keyboard);
}
