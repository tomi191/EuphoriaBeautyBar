import { db } from "@/lib/db";

export const PARALLEL_SAFETY_MIN = 5;

export interface ParallelWindow {
  hostBookingId: string;
  start: number; // ms UTC, already shrunk by safety buffer
  end: number;
}

/** Pure (testable) free window of a booking, or null if none. */
export function windowFor(startMs: number, activeMin: number, processingMin: number): { start: number; end: number } | null {
  if (processingMin <= 2 * PARALLEL_SAFETY_MIN) return null;
  const winStart = startMs + (activeMin + PARALLEL_SAFETY_MIN) * 60000;
  const winEnd = startMs + (activeMin + processingMin - PARALLEL_SAFETY_MIN) * 60000;
  return winEnd > winStart ? { start: winStart, end: winEnd } : null;
}

export async function parallelWindows(resourceId: string, dayStart: Date, dayEnd: Date, excludeId?: string): Promise<ParallelWindow[]> {
  const all = await db.query.bookings.findMany({
    where: (b, { and, eq, gte, lt, notInArray }) =>
      and(eq(b.resourceId, resourceId), gte(b.startAt, dayStart), lt(b.startAt, dayEnd), notInArray(b.status, ["cancelled", "no_show"])),
  });
  // При редакция/преместване на съществуващ час — изключи го, за да не се брои
  // самият той като „зает" прозорец (иначе местене в собствения прозорец се отхвърля).
  const rows = excludeId ? all.filter((b) => b.id !== excludeId) : all;
  const hosts = rows.filter((b) => !b.allowParallel && b.processingMin > 0);
  const parallels = rows.filter((b) => b.allowParallel);
  const out: ParallelWindow[] = [];
  for (const h of hosts) {
    const w = windowFor(h.startAt.getTime(), h.activeMin, h.processingMin);
    if (!w) continue;
    const taken = parallels.some((p) => p.startAt.getTime() < w.end && p.endAt.getTime() > w.start);
    if (!taken) out.push({ hostBookingId: h.id, start: w.start, end: w.end });
  }
  return out;
}

export async function fitsParallelWindow(resourceId: string, start: Date, end: Date, excludeId?: string): Promise<boolean> {
  const dayStart = new Date(start); dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 24 * 3600000);
  const wins = await parallelWindows(resourceId, dayStart, dayEnd, excludeId);
  const s = start.getTime(), e = end.getTime();
  return wins.some((w) => s >= w.start && e <= w.end);
}
