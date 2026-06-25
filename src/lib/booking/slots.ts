import { db } from "@/lib/db";
import { sofiaWallToUtc, sofiaWeekday } from "./time";
import { parallelWindows } from "./parallel";
import { isClosed } from "./closures";
import { computeDaySlots, type SlotStatus, type DaySlot } from "./compute-slots";

// Типовете живеят в ./compute-slots (pure, без DB); реекспорт за съвместимост.
export type { SlotStatus, DaySlot };

const GRANULARITY_MIN = 15;
const DEFAULT_MIN_NOTICE_MIN = 60; // минимум предизвестие за онлайн запис

/**
 * Връща свободните начални часове (ISO UTC низове) за даден ресурс, услуга и
 * дата. Изчислява от работното време на салона минус заетите часове (bookings
 * + time_off), при стъпка 15 мин. Слот е валиден ако цялата услуга + buffer се
 * събира в работното време и не се застъпва с нищо.
 */
export async function getAvailableSlots(opts: {
  resourceId: string;
  durationMin: number;
  bufferMin: number;
  dateStr: string; // YYYY-MM-DD (локална дата)
  now?: Date;
  minNoticeMin?: number;
}): Promise<string[]> {
  if (await isClosed(opts.dateStr)) return []; // салонът е затворен (празник/отпуск)
  const now = opts.now ?? new Date();
  const minNotice = opts.minNoticeMin ?? DEFAULT_MIN_NOTICE_MIN;
  const blockMs = (opts.durationMin + opts.bufferMin) * 60000;

  const wd = sofiaWeekday(opts.dateStr);
  const wh = await db.query.workingHours.findFirst({ where: (w, { eq }) => eq(w.weekday, wd) });
  if (!wh || wh.closed || !wh.openTime || !wh.closeTime) return [];

  const open = sofiaWallToUtc(opts.dateStr, wh.openTime).getTime();
  const close = sofiaWallToUtc(opts.dateStr, wh.closeTime).getTime();

  const dayStart = sofiaWallToUtc(opts.dateStr, "00:00");
  const dayEnd = new Date(dayStart.getTime() + 24 * 3600000);

  const busyBookings = await db.query.bookings.findMany({
    where: (b, { and, eq, gte, lt, notInArray }) =>
      and(
        eq(b.resourceId, opts.resourceId),
        gte(b.startAt, dayStart),
        lt(b.startAt, dayEnd),
        notInArray(b.status, ["cancelled", "no_show"]),
      ),
  });
  const busyOff = await db.query.timeOff.findMany({
    where: (t, { and, or, eq, isNull, lt, gt }) =>
      and(or(eq(t.resourceId, opts.resourceId), isNull(t.resourceId)), lt(t.startAt, dayEnd), gt(t.endAt, dayStart)),
  });

  const busy: Array<[number, number]> = [
    ...busyBookings.map((b) => [b.startAt.getTime(), b.endAt.getTime()] as [number, number]),
    ...busyOff.map((t) => [t.startAt.getTime(), t.endAt.getTime()] as [number, number]),
  ];

  const minStart = now.getTime() + minNotice * 60000;
  const stepMs = GRANULARITY_MIN * 60000;
  const slots: string[] = [];

  for (let t = open; t + blockMs <= close; t += stepMs) {
    if (t < minStart) continue;
    const end = t + blockMs;
    const overlaps = busy.some(([bs, be]) => t < be && end > bs);
    if (!overlaps) slots.push(new Date(t).toISOString());
  }
  return slots;
}

/**
 * Проверява дали интервал [start, end) се застъпва с отпуск/почивка на изпълнителя
 * (или салонна почивка). Извиква се при ЗАПИСВАНЕ — EXCLUDE constraint-ът пази
 * само срещу друг час, не срещу time_off.
 */
export async function hasTimeOffConflict(resourceId: string, start: Date, end: Date): Promise<boolean> {
  const off = await db.query.timeOff.findFirst({
    where: (t, { and, or, eq, isNull, lt, gt }) =>
      and(or(eq(t.resourceId, resourceId), isNull(t.resourceId)), lt(t.startAt, end), gt(t.endAt, start)),
  });
  return !!off;
}

/**
 * Връща ЦЕЛИЯ работен ден като поредица от начални часове със статус — за да
 * вижда клиентът визуално кога е свободно, кога заето и кое е минало, вместо
 * само списък със свободни часове. Денят е затворен → празен масив.
 */
export async function getDaySlots(opts: {
  resourceId: string;
  durationMin: number;
  bufferMin: number;
  dateStr: string;
  now?: Date;
  minNoticeMin?: number;
  allowParallel?: boolean;
  activeMin?: number;
}): Promise<{ open: string; close: string; slots: DaySlot[] } | null> {
  if (await isClosed(opts.dateStr)) return null; // салонът е затворен (празник/отпуск)
  const now = opts.now ?? new Date();
  const minNotice = opts.minNoticeMin ?? DEFAULT_MIN_NOTICE_MIN;
  const blockMs = (opts.durationMin + opts.bufferMin) * 60000;

  const wd = sofiaWeekday(opts.dateStr);
  // Собствено работно време на изпълнителя има предимство; иначе салонното.
  const ownWh = await db.query.resourceWorkingHours.findFirst({
    where: (w, { and, eq }) => and(eq(w.resourceId, opts.resourceId), eq(w.weekday, wd)),
  });
  const wh = ownWh ?? (await db.query.workingHours.findFirst({ where: (w, { eq }) => eq(w.weekday, wd) }));
  if (!wh || wh.closed || !wh.openTime || !wh.closeTime) return null;

  const open = sofiaWallToUtc(opts.dateStr, wh.openTime).getTime();
  const close = sofiaWallToUtc(opts.dateStr, wh.closeTime).getTime();

  const dayStart = sofiaWallToUtc(opts.dateStr, "00:00");
  const dayEnd = new Date(dayStart.getTime() + 24 * 3600000);

  const busyBookings = await db.query.bookings.findMany({
    where: (b, { and, eq, gte, lt, notInArray }) =>
      and(
        eq(b.resourceId, opts.resourceId),
        gte(b.startAt, dayStart),
        lt(b.startAt, dayEnd),
        notInArray(b.status, ["cancelled", "no_show"]),
      ),
  });
  const busyOff = await db.query.timeOff.findMany({
    where: (t, { and, or, eq, isNull, lt, gt }) =>
      and(or(eq(t.resourceId, opts.resourceId), isNull(t.resourceId)), lt(t.startAt, dayEnd), gt(t.endAt, dayStart)),
  });

  const busy: Array<[number, number]> = [
    ...busyBookings.map((b) => [b.startAt.getTime(), b.endAt.getTime()] as [number, number]),
    ...busyOff.map((t) => [t.startAt.getTime(), t.endAt.getTime()] as [number, number]),
  ];

  // При паралелни записи: свободните „престои" в чужди часове (напр. боя), в
  // които се събира кратък втори час. Изчисляват се веднъж за деня.
  const wins = opts.allowParallel ? await parallelWindows(opts.resourceId, dayStart, dayEnd) : [];

  const minStart = now.getTime() + minNotice * 60000;
  const stepMs = GRANULARITY_MIN * 60000;
  // Паралелът се мери по АКТИВНОТО време (нанасяне); ако услугата няма активно,
  // връщаме се към целия блок (поведение както досега за услуги без престой).
  const activeMs = (opts.activeMin && opts.activeMin > 0 ? opts.activeMin : opts.durationMin) * 60000;

  const slots = computeDaySlots({
    open,
    close,
    busy,
    wins,
    blockMs,
    activeMs,
    minStart,
    stepMs,
    allowParallel: opts.allowParallel === true,
  });

  return { open: new Date(open).toISOString(), close: new Date(close).toISOString(), slots };
}
