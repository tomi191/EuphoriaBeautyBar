/** Pure (без DB) ядро на дневния график — изолирано за unit тестване. */
import { slotParallelFits, windowFor, type SlotNeighbor } from "./parallel-window";

export type SlotStatus = "free" | "busy" | "past" | "parallel";

export interface DaySlot {
  start: string; // ISO UTC
  status: SlotStatus;
}

export interface ComputeSlotsParams {
  open: number; // ms UTC начало на работния ден
  close: number; // ms UTC край
  neighbors: SlotNeighbor[]; // заети часове (bookings) + отпуски (като плътни: processingMin=0)
  blockMs: number; // (durationMin + bufferMin) * 60000 на НОВАТА услуга
  activeMin: number; // ефективно активно време на новата услуга (или durationMin ако няма)
  processingMin: number; // престой на новата услуга
  minStart: number; // ms UTC — преди това = past
  stepMs: number; // стъпка (15 мин)
  allowParallel: boolean;
}

/**
 * Pure: статус на всеки слот. Паралел = симетричен (slotParallelFits): нов час се
 * вписва, ако заетите му времена не се блъскат с ничии и заетото на единия е в
 * престоя на другия — независимо от реда на запис.
 */
export function computeDaySlots(p: ComputeSlotsParams): DaySlot[] {
  const out: DaySlot[] = [];
  const activeMs = p.activeMin * 60000;
  for (let t = p.open; t + activeMs <= p.close; t += p.stepMs) {
    const blockEnd = t + p.blockMs;
    const fitsBlock = blockEnd <= p.close;
    const overlaps = p.neighbors.some((n) => t < n.end && blockEnd > n.start);

    let status: SlotStatus;
    if (!overlaps) {
      if (!fitsBlock) continue; // блокът излиза извън деня, няма паралел → не показвай
      status = t < p.minStart ? "past" : "free";
    } else if (p.allowParallel && slotParallelFits(t, blockEnd, p.activeMin, p.processingMin, p.neighbors)) {
      status = t < p.minStart ? "past" : "parallel";
    } else if (fitsBlock) {
      status = "busy";
    } else {
      continue;
    }
    out.push({ start: new Date(t).toISOString(), status });
  }

  // „Snap" слотове: 15-мин мрежата може да пропусне тесен престой прозорец (напр.
  // престой 15:50–16:20 — grid дава 15:45/16:00, но само 15:50 се събира). Добавяме
  // слот точно в началото на всеки престой прозорец, ако паралелен час се събира там.
  if (p.allowParallel) {
    const seen = new Set(out.map((s) => Date.parse(s.start)));
    for (const n of p.neighbors) {
      const w = windowFor(n.start, n.activeMin, n.processingMin);
      if (!w) continue;
      const t = w.start;
      if (seen.has(t) || t < p.open || t + activeMs > p.close) continue;
      if (slotParallelFits(t, t + p.blockMs, p.activeMin, p.processingMin, p.neighbors)) {
        out.push({ start: new Date(t).toISOString(), status: t < p.minStart ? "past" : "parallel" });
        seen.add(t);
      }
    }
    out.sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  }

  return out;
}

/**
 * Pure: само началата в :00 и :30 (решение 4, настройка на изпълнителя за онлайн записа). София е с цели
 * часове разлика от UTC, затова минутата в UTC е минутата на стената.
 */
export function roundStartsOnly(slots: DaySlot[]): DaySlot[] {
  return slots.filter((s) => new Date(s.start).getUTCMinutes() % 30 === 0);
}

/**
 * Pure: начала «веднага след предишния» (решение 4): краят на всеки час в деня, ако услугата се събира от
 * там без застъпване (паузата вече е в края на часа), в работното време и не в миналото.
 */
export function startsAfterBookings(p: {
  ends: number[];
  open: number;
  close: number;
  neighbors: SlotNeighbor[];
  blockMs: number;
  minStart: number;
}): string[] {
  const out = new Set<number>();
  for (const t of p.ends) {
    const end = t + p.blockMs;
    if (t < p.open || end > p.close || t < p.minStart) continue;
    if (p.neighbors.some((n) => t < n.end && end > n.start)) continue;
    out.add(t);
  }
  return [...out].sort((a, b) => a - b).map((t) => new Date(t).toISOString());
}
