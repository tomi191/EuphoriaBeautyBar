"use server";

import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireAdmin } from "@/lib/actions/auth-guard";
import { ADMIN_CHAT_KEY, ADMIN_LINK_TOKEN_KEY, getAdminChatId } from "@/lib/telegram";

export interface AdminTelegramLinkState {
  connected: boolean;
  url: string | null; // deep link (null ако вече свързан или липсва bot username)
}

async function setSetting(key: string, value: unknown): Promise<void> {
  await db
    .insert(schema.siteSettings)
    .values({ key, value: value as object, updatedAt: new Date() })
    .onConflictDoUpdate({ target: schema.siteSettings.key, set: { value: value as object, updatedAt: new Date() } });
}

/**
 * Състояние + deep link за свързване на АДМИН Telegram канала (собственика получава
 * всички нови онлайн записи/откази, не само per-изпълнител). Токенът е с префикс
 * "adm-", за да не се бърка с изпълнителските в webhook-а.
 */
export async function getAdminTelegramLink(): Promise<AdminTelegramLinkState> {
  await requireAdmin();
  if (await getAdminChatId()) return { connected: true, url: null };

  const botUser = process.env.TELEGRAM_BOT_USERNAME;
  const row = await db.query.siteSettings.findFirst({ where: (s, { eq: e }) => e(s.key, ADMIN_LINK_TOKEN_KEY) });
  let token = (row?.value as { token?: string } | undefined)?.token;
  if (!token) {
    token = `adm-${nanoid(16)}`;
    await setSetting(ADMIN_LINK_TOKEN_KEY, { token });
  }
  return { connected: false, url: botUser ? `https://t.me/${botUser}?start=${token}` : null };
}

/** Разсвързва админ канала. */
export async function disconnectAdminTelegram(): Promise<{ ok: true }> {
  await requireAdmin();
  await db.delete(schema.siteSettings).where(eq(schema.siteSettings.key, ADMIN_CHAT_KEY));
  await db.delete(schema.siteSettings).where(eq(schema.siteSettings.key, ADMIN_LINK_TOKEN_KEY));
  return { ok: true };
}
