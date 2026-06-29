import { db } from "@/lib/db";
import { sofiaWallToUtc, sofiaDateStr, sofiaTimeLabel, sofiaWeekday } from "@/lib/booking/time";
import type { InlineKeyboard } from "@/lib/telegram";

const TZ = "Europe/Sofia";
const longFmt = new Intl.DateTimeFormat("bg-BG", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });
const shortFmt = new Intl.DateTimeFormat("bg-BG", { timeZone: TZ, day: "2-digit", month: "2-digit" });
const timeFmt = new Intl.DateTimeFormat("bg-BG", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false });

// Статус → цветен индикатор (визуален ритъм като staff таймлайна).
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
function durLabel(min: number): string {
  if (min < 60) return `${min} мин`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} ч ${m} мин` : `${h} ч`;
}
// Бар за продължителност: ~20 мин на знак (1–14 знака).
function durBar(min: number): string {
  return "▰".repeat(Math.max(1, Math.min(14, Math.round(min / 20))));
}
// Бар за запълненост на деня (14 знака: заето ▓ / свободно ░).
function fillBar(busyMin: number, spanMin: number): string {
  const pct = spanMin > 0 ? Math.max(0, Math.min(1, busyMin / spanMin)) : 0;
  const filled = Math.round(pct * 14);
  return "▓".repeat(filled) + "░".repeat(14 - filled) + ` ${Math.round(pct * 100)}%`;
}

/**
 * Богат дневен график за Telegram (HTML + Unicode барове). Header с работен диапазон и
 * бар за запълненост; всеки час с цветен статус, бар за продължителност, клиент и кликаем
 * телефон; свободните прозорци (>=20 мин) са видими; маркер „сега" за днешния ден. Долу —
 * бутони за навигация (предишен/днес/следващ). Същата концепция като /staff таймлайна.
 */
export async function buildDaySchedule(resourceId: string, dateKey: string): Promise<{ text: string; keyboard: InlineKeyboard }> {
  const dayStart = sofiaWallToUtc(dateKey, "00:00");
  const dayEnd = new Date(dayStart.getTime() + 24 * 3600000);
  const wd = sofiaWeekday(dateKey);
  const now = new Date();
  const isToday = dateKey === sofiaDateStr(now);

  const [bookings, ownWh, salonWh] = await Promise.all([
    db.query.bookings.findMany({
      where: (b, { and, eq, gte, lt, notInArray }) =>
        and(eq(b.resourceId, resourceId), gte(b.startAt, dayStart), lt(b.startAt, dayEnd), notInArray(b.status, ["cancelled"])),
      orderBy: (b, { asc }) => [asc(b.startAt)],
    }),
    db.query.resourceWorkingHours.findFirst({ where: (w, { and, eq }) => and(eq(w.resourceId, resourceId), eq(w.weekday, wd)) }),
    db.query.workingHours.findFirst({ where: (w, { eq }) => eq(w.weekday, wd) }),
  ]);
  const clientIds = [...new Set(bookings.map((b) => b.clientId).filter(Boolean) as string[])];
  const clients = clientIds.length ? await db.query.clients.findMany({ where: (c, { inArray }) => inArray(c.id, clientIds) }) : [];
  const clientById = new Map(clients.map((c) => [c.id, c]));

  const wh = ownWh ?? salonWh;
  const closed = !wh || wh.closed || !wh.openTime || !wh.closeTime;
  const openAt = !closed ? sofiaWallToUtc(dateKey, wh!.openTime!) : null;
  const closeAt = !closed ? sofiaWallToUtc(dateKey, wh!.closeTime!) : null;

  const title = `📅 <b>${cap(longFmt.format(dayStart))}</b>`;
  const lines: string[] = [title];

  if (bookings.length === 0) {
    lines.push("");
    lines.push(closed ? "🌙 <i>Почивен ден.</i>" : "<i>Няма записани часове.</i>");
    if (!closed && openAt && closeAt) lines.push(`<i>Работно време: ${timeFmt.format(openAt)}–${timeFmt.format(closeAt)}</i>`);
  } else {
    const busyMin = bookings.reduce((s, b) => s + Math.round((b.endAt.getTime() - b.startAt.getTime()) / 60000), 0);
    const spanStart = openAt ?? bookings[0].startAt;
    const spanEnd = closeAt ?? bookings[bookings.length - 1].endAt;
    const spanMin = Math.round((spanEnd.getTime() - spanStart.getTime()) / 60000);
    lines.push(`🕐 ${timeFmt.format(spanStart)}–${timeFmt.format(spanEnd)}  ·  ${bookings.length} ${bookings.length === 1 ? "час" : "часа"}  ·  ${durLabel(busyMin)} заети`);
    lines.push(`<code>${fillBar(busyMin, spanMin)}</code>`);
    lines.push("➖➖➖➖➖➖➖➖");

    let cursor = openAt;
    let nowShown = false;
    const maybeNow = (at: Date) => {
      if (isToday && !nowShown && now.getTime() <= at.getTime()) {
        lines.push(`🔴 <b>сега ${timeFmt.format(now)}</b>`);
        nowShown = true;
      }
    };

    for (const b of bookings) {
      // Свободен прозорец преди този час (>=20 мин).
      if (cursor && b.startAt.getTime() - cursor.getTime() >= 20 * 60000) {
        maybeNow(cursor);
        const gap = Math.round((b.startAt.getTime() - cursor.getTime()) / 60000);
        lines.push("");
        lines.push(`▫️ <i>свободно ${timeFmt.format(cursor)}–${timeFmt.format(b.startAt)} · ${durLabel(gap)}</i>`);
      }
      maybeNow(b.startAt);
      const c = b.clientId ? clientById.get(b.clientId) : undefined;
      const dot = STATUS_DOT[b.status] ?? "•";
      const mins = Math.round((b.endAt.getTime() - b.startAt.getTime()) / 60000);
      lines.push("");
      lines.push(`${dot} <b>${timeFmt.format(b.startAt)}–${timeFmt.format(b.endAt)}</b> · ${esc(b.serviceName)}`);
      lines.push(`<code>${durBar(mins)}</code> ${durLabel(mins)}`);
      if (c?.name) lines.push(`👤 ${esc(c.name)}`);
      if (c?.phone) lines.push(`📞 <a href="tel:${digits(c.phone)}">${esc(c.phone)}</a>`);
      if (b.notes) lines.push(`📝 <i>${esc(b.notes)}</i>`);
      if (!cursor || b.endAt.getTime() > cursor.getTime()) cursor = b.endAt;
    }
    if (cursor && closeAt && closeAt.getTime() - cursor.getTime() >= 20 * 60000) {
      maybeNow(cursor);
      lines.push("");
      lines.push(`▫️ <i>свободно ${timeFmt.format(cursor)}–${timeFmt.format(closeAt)} · ${durLabel(Math.round((closeAt.getTime() - cursor.getTime()) / 60000))}</i>`);
    }
    if (isToday && !nowShown) lines.push(`\n🔴 <b>сега ${timeFmt.format(now)}</b>`);
  }

  let text = lines.join("\n");
  if (text.length > 3900) text = text.slice(0, 3850) + "\n…";

  const prev = sofiaDateStr(new Date(dayStart.getTime() - 12 * 3600000));
  const next = sofiaDateStr(new Date(dayStart.getTime() + 36 * 3600000));
  const todayKey = sofiaDateStr(now);
  const keyboard: InlineKeyboard = {
    inline_keyboard: [
      [
        { text: `◀ ${dayShort(prev)}`, callback_data: `day:${prev}` },
        { text: dateKey === todayKey ? "● Днес" : "Днес", callback_data: `day:${todayKey}` },
        { text: `${dayShort(next)} ▶`, callback_data: `day:${next}` },
      ],
    ],
  };
  return { text, keyboard };
}
