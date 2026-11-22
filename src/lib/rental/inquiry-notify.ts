/**
 * Известието за ново запитване от обявата: Telegram към администрацията (админ каналът) и към
 * изпълнителя, вързан към админ акаунт (Снежана), ако е свързан. Камбанката чете самата таблица,
 * затова не иска изпращане. Не хвърля: резултатът по канал се връща и се пише в notify_log, а
 * всяка грешка отива и в лога на сървъра (не се превръща в тишина).
 */
import { db } from "@/lib/db";
import { getAdminChatId, sendTelegram } from "@/lib/telegram";
import { inquiryTelegramLines } from "@/lib/rental/inquiry-rules";

export interface InquiryNotifyLog {
  at: string;
  /** Колко Telegram чата са намерени (0 = нищо не е свързано: остава само камбанката). */
  targets: number;
  telegram: { to: "admin" | "owner"; ok: boolean }[];
  error?: string;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Чатовете: админ каналът и изпълнителите, вързани към потребител с роля admin; без повторения. */
async function inquiryChats(): Promise<{ to: "admin" | "owner"; chatId: string }[]> {
  const [adminChat, owners] = await Promise.all([
    getAdminChatId(),
    db.query.user.findMany({ where: (u, { eq }) => eq(u.role, "admin"), columns: { id: true } }),
  ]);
  const ownerIds = owners.map((o) => o.id);
  const resources = ownerIds.length
    ? await db.query.resources.findMany({
        where: (r, { and, inArray, isNotNull }) => and(inArray(r.userId, ownerIds), isNotNull(r.telegramChatId)),
        columns: { telegramChatId: true },
      })
    : [];
  const out: { to: "admin" | "owner"; chatId: string }[] = [];
  const seen = new Set<string>();
  if (adminChat) {
    out.push({ to: "admin", chatId: adminChat });
    seen.add(adminChat);
  }
  for (const r of resources) {
    const id = r.telegramChatId as string;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ to: "owner", chatId: id });
  }
  return out;
}

export async function notifyRentalInquiry(i: {
  id: string;
  position: string;
  name: string;
  phone: string;
  message: string | null;
}): Promise<InquiryNotifyLog> {
  const log: InquiryNotifyLog = { at: new Date().toISOString(), targets: 0, telegram: [] };
  try {
    const chats = await inquiryChats();
    log.targets = chats.length;
    if (chats.length === 0) {
      // Нищо не е свързано: запитването е само в администрацията. Не е доставено, затова е грешка.
      log.error = "Няма свързан Telegram: запитването е само в администрацията.";
      console.error("[rental-inquiry] %s: известието не стигна до никого (няма свързан Telegram)", i.id);
      return log;
    }
    const text = inquiryTelegramLines(i).map(esc).join("\n");
    const results = await Promise.allSettled(chats.map((c) => sendTelegram(c.chatId, text)));
    log.telegram = chats.map((c, n) => ({
      to: c.to,
      ok: results[n].status === "fulfilled" && (results[n] as PromiseFulfilledResult<boolean>).value === true,
    }));
    const failed = log.telegram.filter((t) => !t.ok).map((t) => t.to);
    if (failed.length) {
      log.error = `Telegram не тръгна към: ${failed.join(", ")}`;
      console.error("[rental-inquiry] %s: известието не тръгна към %s", i.id, failed.join(", "));
    }
  } catch (e) {
    log.error = e instanceof Error ? e.message : String(e);
    console.error("[rental-inquiry] %s: известието падна:", i.id, log.error);
  }
  return log;
}
