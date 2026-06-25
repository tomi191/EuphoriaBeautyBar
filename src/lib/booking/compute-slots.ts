/** Pure (без DB) ядро на дневния график — изолирано за unit тестване. */

export type SlotStatus = "free" | "busy" | "past" | "parallel";

export interface DaySlot {
  start: string; // ISO UTC
  status: SlotStatus;
}

export interface ComputeSlotsParams {
  open: number; // ms UTC начало на работния ден
  close: number; // ms UTC край
  busy: Array<[number, number]>; // заети интервали [start, end)
  wins: Array<{ start: number; end: number }>; // паралелни прозорци (престои)
  blockMs: number; // (durationMin + bufferMin) * 60000
  activeMs: number; // activeMin * 60000 (или blockMs ако няма активно)
  minStart: number; // ms UTC — преди това = past
  stepMs: number; // стъпка (15 мин)
  allowParallel: boolean;
}

/**
 * Pure: пресмята статуса на всеки слот за деня. Паралелът е ACTIVE-based —
 * втори (дълъг) час се събира, ако само активното му време попада в чужд престой;
 * престоят му може да прелее след работното време.
 */
export function computeDaySlots(p: ComputeSlotsParams): DaySlot[] {
  const out: DaySlot[] = [];
  for (let t = p.open; t + p.activeMs <= p.close; t += p.stepMs) {
    const blockEnd = t + p.blockMs;
    const activeEnd = t + p.activeMs;
    const fitsBlock = blockEnd <= p.close;
    const overlaps = p.busy.some(([bs, be]) => t < be && blockEnd > bs);

    let status: SlotStatus;
    if (!overlaps) {
      if (!fitsBlock) continue; // блокът излиза извън деня, няма паралел → не показвай
      status = t < p.minStart ? "past" : "free";
    } else if (p.allowParallel && p.wins.some((w) => t >= w.start && activeEnd <= w.end)) {
      status = t < p.minStart ? "past" : "parallel";
    } else if (fitsBlock) {
      status = "busy";
    } else {
      continue; // застъпен блок, който и без друго не се събира, и не е паралел
    }
    out.push({ start: new Date(t).toISOString(), status });
  }
  return out;
}
