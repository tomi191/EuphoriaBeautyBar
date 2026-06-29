import { db } from "@/lib/db";
import { sofiaWallToUtc, sofiaWeekday } from "./time";
import { isClosed } from "./closures";
import { computeDaySlots, type SlotStatus, type DaySlot } from "./compute-slots";
import type { SlotNeighbor } from "./parallel-window";

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
  const now = opts.now ?? new Date();
  const minNotice = opts.minNoticeMin ?? DEFAULT_MIN_NOTICE_MIN;
  const blockMs = (opts.durationMin + opts.bufferMin) * 60000;
  const wd = sofiaWeekday(opts.dateStr);
  const dayStart = sofiaWallToUtc(opts.dateStr, "00:00");
  const dayEnd = new Date(dayStart.getTime() + 24 * 3600000);

  // Четирите независими заявки паралелно (бяха серийни → 4 RTT).
  const [closed, wh, busyBookings, busyOff] = await Promise.all([
    isClosed(opts.dateStr),
    db.query.workingHours.findFirst({ where: (w, { eq }) => eq(w.weekday, wd) }),
    db.query.bookings.findMany({
      where: (b, { and, eq, gte, lt, notInArray }) =>
        and(eq(b.resourceId, opts.resourceId), gte(b.startAt, dayStart), lt(b.startAt, dayEnd), notInArray(b.status, ["cancelled", "no_show"])),
    }),
    db.query.timeOff.findMany({
      where: (t, { and, or, eq, isNull, lt, gt }) =>
        and(or(eq(t.resourceId, opts.resourceId), isNull(t.resourceId)), lt(t.startAt, dayEnd), gt(t.endAt, dayStart)),
    }),
  ]);
  if (closed) return []; // салонът е затворен (празник/отпуск)
  if (!wh || wh.closed || !wh.openTime || !wh.closeTime) return [];

  const open = sofiaWallToUtc(opts.dateStr, wh.openTime).getTime();
  const close = sofiaWallToUtc(opts.dateStr, wh.closeTime).getTime();

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
  processingMin?: number;
}): Promise<{ open: string; close: string; slots: DaySlot[] } | null> {
  const now = opts.now ?? new Date();
  const minNotice = opts.minNoticeMin ?? DEFAULT_MIN_NOTICE_MIN;
  const blockMs = (opts.durationMin + opts.bufferMin) * 60000;
  const wd = sofiaWeekday(opts.dateStr);
  const dayStart = sofiaWallToUtc(opts.dateStr, "00:00");
  const dayEnd = new Date(dayStart.getTime() + 24 * 3600000);

  // Петте независими заявки текат ПАРАЛЕЛНО (преди бяха серийни → 5 RTT на всеки
  // slot fetch, т.е. 1-3s на слаба мрежа). salonWh се чете винаги (евтино), а в JS
  // решаваме own ?? салон. Лек overhead в рядкия случай, голям печат на честия.
  const [closed, ownWh, salonWh, busyBookings, busyOff] = await Promise.all([
    isClosed(opts.dateStr),
    db.query.resourceWorkingHours.findFirst({
      where: (w, { and, eq }) => and(eq(w.resourceId, opts.resourceId), eq(w.weekday, wd)),
    }),
    db.query.workingHours.findFirst({ where: (w, { eq }) => eq(w.weekday, wd) }),
    db.query.bookings.findMany({
      where: (b, { and, eq, gte, lt, notInArray }) =>
        and(eq(b.resourceId, opts.resourceId), gte(b.startAt, dayStart), lt(b.startAt, dayEnd), notInArray(b.status, ["cancelled", "no_show"])),
    }),
    db.query.timeOff.findMany({
      where: (t, { and, or, eq, isNull, lt, gt }) =>
        and(or(eq(t.resourceId, opts.resourceId), isNull(t.resourceId)), lt(t.startAt, dayEnd), gt(t.endAt, dayStart)),
    }),
  ]);
  if (closed) return null; // салонът е затворен (празник/отпуск)
  const wh = ownWh ?? salonWh; // собственото работно време има предимство
  if (!wh || wh.closed || !wh.openTime || !wh.closeTime) return null;

  const open = sofiaWallToUtc(opts.dateStr, wh.openTime).getTime();
  const close = sofiaWallToUtc(opts.dateStr, wh.closeTime).getTime();

  // Съседи за паралелната проверка: реалните часове (с фази) + отпуски като
  // ПЛЪТНИ блокове (processingMin=0 → не приемат паралел).
  const neighbors: SlotNeighbor[] = [
    ...busyBookings.map((b) => ({
      start: b.startAt.getTime(),
      end: b.endAt.getTime(),
      activeMin: b.activeMin,
      processingMin: b.processingMin,
    })),
    ...busyOff.map((t) => ({
      start: t.startAt.getTime(),
      end: t.endAt.getTime(),
      activeMin: Math.max(0, Math.round((t.endAt.getTime() - t.startAt.getTime()) / 60000)),
      processingMin: 0,
    })),
  ];

  const minStart = now.getTime() + minNotice * 60000;
  const stepMs = GRANULARITY_MIN * 60000;
  // Паралелът се мери по АКТИВНОТО време; ако услугата няма активно, връщаме се
  // към целия блок (поведение както за услуги без престой).
  const activeMin = opts.activeMin && opts.activeMin > 0 ? opts.activeMin : opts.durationMin;

  const slots = computeDaySlots({
    open,
    close,
    neighbors,
    blockMs,
    activeMin,
    processingMin: opts.processingMin ?? 0,
    minStart,
    stepMs,
    allowParallel: opts.allowParallel === true,
  });

  return { open: new Date(open).toISOString(), close: new Date(close).toISOString(), slots };
}
