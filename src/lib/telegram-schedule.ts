import { db } from "@/lib/db";
import { sofiaWallToUtc, sofiaDateStr, sofiaTimeLabel } from "@/lib/booking/time";
import type { InlineKeyboard } from "@/lib/telegram";

const TZ = "Europe/Sofia";
const longFmt = new Intl.DateTimeFormat("bg-BG", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });
const shortFmt = new Intl.DateTimeFormat("bg-BG", { timeZone: TZ, day: "2-digit", month: "2-digit" });

// Статус → цветна точка (визуален ритъм в списъка, като staff таймлайна).
const STATUS_DOT: Record<string, string> = {
  confirmed: "🟢",
  pending: "🟡",
  arrived: "🔵",
  completed: "✅",
  no_show: "⚪",
};

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function dayShort(dateKey: string): string {
  return shortFmt.format(sofiaWallToUtc(dateKey, "12:00"));
}
function digits(phone: string): string {
  const t = phone.trim();
  return (t.startsWith("+") ? "+" : "") + t.replace(/\D/g, "");
}

/**
 * Форматира дневния график на изпълнител за Telegram (HTML) + бутони за навигация
 * (предишен / днес / следващ ден). Заетите часове са с час, услуга, клиент и кликаем
 * телефон. Отменените се пропускат. Същият модел като /staff таймлайна, но за чат.
 */
export async function buildDaySchedule(resourceId: string, dateKey: string): Promise<{ text: string; keyboard: InlineKeyboard }> {
  const dayStart = sofiaWallToUtc(dateKey, "00:00");
  const dayEnd = new Date(dayStart.getTime() + 24 * 3600000);

  const bookings = await db.query.bookings.findMany({
    where: (b, { and, eq, gte, lt, notInArray }) =>
      and(eq(b.resourceId, resourceId), gte(b.startAt, dayStart), lt(b.startAt, dayEnd), notInArray(b.status, ["cancelled"])),
    orderBy: (b, { asc }) => [asc(b.startAt)],
  });
  const clientIds = [...new Set(bookings.map((b) => b.clientId).filter(Boolean) as string[])];
  const clients = clientIds.length ? await db.query.clients.findMany({ where: (c, { inArray }) => inArray(c.id, clientIds) }) : [];
  const clientById = new Map(clients.map((c) => [c.id, c]));

  const header = `📅 <b>${cap(longFmt.format(dayStart))}</b>`;
  let body: string;
  if (bookings.length === 0) {
    body = "\n\n<i>Няма записани часове за този ден.</i>";
  } else {
    body =
      "\n\n" +
      bookings
        .map((b) => {
          const c = b.clientId ? clientById.get(b.clientId) : undefined;
          const dot = STATUS_DOT[b.status] ?? "•";
          const time = `${sofiaTimeLabel(b.startAt)}–${sofiaTimeLabel(b.endAt)}`;
          const who = c?.name ? ` · ${esc(c.name)}` : "";
          const tel = c?.phone ? `\n   📞 <a href="tel:${digits(c.phone)}">${esc(c.phone)}</a>` : "";
          return `${dot} <b>${time}</b> · ${esc(b.serviceName)}${who}${tel}`;
        })
        .join("\n\n");
  }
  const footer = bookings.length ? `\n\n<i>${bookings.length} ${bookings.length === 1 ? "час" : "часа"}</i>` : "";

  const prev = sofiaDateStr(new Date(dayStart.getTime() - 12 * 3600000));
  const next = sofiaDateStr(new Date(dayStart.getTime() + 36 * 3600000));
  const todayKey = sofiaDateStr(new Date());
  const keyboard: InlineKeyboard = {
    inline_keyboard: [
      [
        { text: `◀ ${dayShort(prev)}`, callback_data: `day:${prev}` },
        { text: dateKey === todayKey ? "● Днес" : "Днес", callback_data: `day:${todayKey}` },
        { text: `${dayShort(next)} ▶`, callback_data: `day:${next}` },
      ],
    ],
  };
  return { text: header + body + footer, keyboard };
}
