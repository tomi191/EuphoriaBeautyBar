/** Pure (без DB) ядро на паралелните прозорци — изолирано за unit тестване. */

export const PARALLEL_SAFETY_MIN = 5;

export interface ParallelWindow {
  hostBookingId: string;
  start: number; // ms UTC, already shrunk by safety buffer
  end: number;
}

/** Pure (testable) free window of a booking, or null if none. */
export function windowFor(
  startMs: number,
  activeMin: number,
  processingMin: number,
): { start: number; end: number } | null {
  if (processingMin <= 2 * PARALLEL_SAFETY_MIN) return null;
  const winStart = startMs + (activeMin + PARALLEL_SAFETY_MIN) * 60000;
  const winEnd = startMs + (activeMin + processingMin - PARALLEL_SAFETY_MIN) * 60000;
  return winEnd > winStart ? { start: winStart, end: winEnd } : null;
}

export interface SlotNeighbor {
  start: number; // ms UTC начало (booking.startAt)
  end: number; // ms UTC край (booking.endAt — край на целия блок)
  activeMin: number;
  processingMin: number;
}

/**
 * Заетото време на час: ако има престой → само намазването [start, start+active];
 * ако НЯМА престой (processing ≤ 2×safety) → целият блок е плътно зает [start, end].
 */
function busySpan(startMs: number, endMs: number, activeMin: number, procMin: number) {
  if (procMin > 2 * PARALLEL_SAFETY_MIN) return { start: startMs, end: startMs + activeMin * 60000 };
  return { start: startMs, end: endMs };
}

/**
 * Симетрична проверка дали два часа може да текат паралелно:
 *  (a) заетите времена не се застъпват, с поне PARALLEL_SAFETY_MIN мин помежду им;
 *  (b) заетото на единия е ИЗЦЯЛО в престоя (windowFor) на другия.
 * Услуга без престой → windowFor = null → не може да приеме/влезе паралелно.
 */
export function pairFits(
  candStart: number, candEnd: number, candActiveMin: number, candProcMin: number,
  otherStart: number, otherEnd: number, otherActiveMin: number, otherProcMin: number,
): boolean {
  const SAFETY = PARALLEL_SAFETY_MIN * 60000;
  const cb = busySpan(candStart, candEnd, candActiveMin, candProcMin);
  const ob = busySpan(otherStart, otherEnd, otherActiveMin, otherProcMin);
  if (!(cb.start >= ob.end + SAFETY || ob.start >= cb.end + SAFETY)) return false;
  const cw = windowFor(candStart, candActiveMin, candProcMin);
  const ow = windowFor(otherStart, otherActiveMin, otherProcMin);
  const candInOther = ow !== null && cb.start >= ow.start && cb.end <= ow.end;
  const otherInCand = cw !== null && ob.start >= cw.start && ob.end <= cw.end;
  return candInOther || otherInCand;
}

/**
 * Кандидат-блок [candStart, candEnd) се вписва паралелно, ако застъпва поне един
 * съсед и pairFits е true с ВСЕКИ застъпен (никое заето време не се блъска).
 */
export function slotParallelFits(
  candStart: number, candEnd: number, candActiveMin: number, candProcMin: number,
  neighbors: SlotNeighbor[],
): boolean {
  const hit = neighbors.filter((n) => candStart < n.end && candEnd > n.start);
  if (hit.length === 0) return false;
  return hit.every((n) =>
    pairFits(candStart, candEnd, candActiveMin, candProcMin, n.start, n.end, n.activeMin, n.processingMin),
  );
}
