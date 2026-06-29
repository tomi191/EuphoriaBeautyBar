"use server";

import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireStaff } from "@/lib/actions/auth-guard";

export interface TelegramLinkState {
  connected: boolean;
  url: string | null; // deep link за свързване (null ако вече свързан или липсва bot username)
}

/** Текущо състояние + (при нужда) генерира deep link за свързване на Telegram. */
export async function getTelegramLink(): Promise<TelegramLinkState> {
  const { resource } = await requireStaff();
  if (resource.telegramChatId) return { connected: true, url: null };

  const botUser = process.env.TELEGRAM_BOT_USERNAME;
  let token = resource.telegramLinkToken;
  if (!token) {
    token = nanoid(16);
    await db.update(schema.resources).set({ telegramLinkToken: token }).where(eq(schema.resources.id, resource.id));
  }
  return { connected: false, url: botUser ? `https://t.me/${botUser}?start=${token}` : null };
}

/** Разсвързва Telegram за текущия изпълнител. */
export async function disconnectTelegram(): Promise<{ ok: true }> {
  const { resource } = await requireStaff();
  await db.update(schema.resources).set({ telegramChatId: null, telegramLinkToken: null }).where(eq(schema.resources.id, resource.id));
  return { ok: true };
}
