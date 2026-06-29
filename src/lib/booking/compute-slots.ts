/** Pure (без DB) ядро на дневния график — изолирано за unit тестване. */
import { slotParallelFits, type SlotNeighbor } from "./parallel-window";

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
  return out;
}
