import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { sendTelegram, editMessageText, answerCallback, findResourceByChatId } from "@/lib/telegram";
import { buildDaySchedule } from "@/lib/telegram-schedule";
import { sofiaDateStr } from "@/lib/booking/time";

export const dynamic = "force-dynamic";

type TgChat = { id?: number | string };
type TgMessage = { message_id?: number; text?: string; chat?: TgChat };
type TgCallback = { id: string; data?: string; message?: TgMessage };
type TgUpdate = { message?: TgMessage; callback_query?: TgCallback };

const HELP = "За да получаваш известия, свържи акаунта си от профила в приложението (бутон Свържи Telegram).";

/**
 * Telegram webhook. Обработва:
 *  - /start <token> → свързва изпълнител (еднократен код от профила)
 *  - /today (+ /grafik /dnes) → дневен график с навигация
 *  - callback day:YYYY-MM-DD → редактира съобщението към друг ден (inline бутони)
 * Валидира secret header. Винаги връща 200, за да не кара Telegram да повтаря.
 */
export async function POST(req: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret && req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let update: TgUpdate;
  try {
    update = (await req.json()) as TgUpdate;
  } catch {
    return NextResponse.json({ ok: true });
  }

  // 1) Натиснат inline бутон → навигация по дни (редактира същото съобщение).
  const cb = update.callback_query;
  if (cb) {
    await answerCallback(cb.id);
    const chatId = cb.message?.chat?.id;
    const messageId = cb.message?.message_id;
    const dm = (cb.data ?? "").match(/^day:(\d{4}-\d{2}-\d{2})$/);
    if (dm && chatId !== undefined && messageId !== undefined) {
      const res = await findResourceByChatId(chatId);
      if (res) {
        const { text, keyboard } = await buildDaySchedule(res.id, dm[1]);
        await editMessageText(chatId, messageId, text, keyboard);
      }
    }
    return NextResponse.json({ ok: true });
  }

  // 2) Текстово съобщение / команда.
  const text = update.message?.text ?? "";
  const rawChat = update.message?.chat?.id;
  if (rawChat === undefined || rawChat === null) return NextResponse.json({ ok: true });
  const chatId = String(rawChat);

  // /start <token> → свързване.
  const start = text.match(/^\/start(?:\s+(\S+))?/);
  if (start) {
    const token = start[1];
    if (!token) {
      await sendTelegram(chatId, "Здравей! " + HELP);
      return NextResponse.json({ ok: true });
    }
    const res = await db.query.resources.findFirst({ where: (r, { eq: e }) => e(r.telegramLinkToken, token) });
    if (!res) {
      await sendTelegram(chatId, "Невалиден или изтекъл код. Опитай пак от профила си в приложението.");
      return NextResponse.json({ ok: true });
    }
    await db.update(schema.resources).set({ telegramChatId: chatId, telegramLinkToken: null }).where(eq(schema.resources.id, res.id));
    await sendTelegram(chatId, "Свързан си, " + res.name + "! Тук ще получаваш известия за новите си записи. Напиши /today за днешния график.");
    return NextResponse.json({ ok: true });
  }

  // /today (+ синоними) → дневен график.
  if (/^\/(today|grafik|dnes)\b/i.test(text)) {
    const res = await findResourceByChatId(chatId);
    if (!res) {
      await sendTelegram(chatId, HELP);
      return NextResponse.json({ ok: true });
    }
    const { text: t, keyboard } = await buildDaySchedule(res.id, sofiaDateStr(new Date()));
    await sendTelegram(chatId, t, keyboard);
    return NextResponse.json({ ok: true });
  }

  await sendTelegram(chatId, HELP + "\n\nКоманда: /today — днешен график.");
  return NextResponse.json({ ok: true });
}
