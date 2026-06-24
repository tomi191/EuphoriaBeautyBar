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
