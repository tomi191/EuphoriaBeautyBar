import { db } from "@/lib/db";
import { PARALLEL_SAFETY_MIN, windowFor, slotParallelFits, type ParallelWindow, type SlotNeighbor } from "./parallel-window";

// Реекспорт за съвместимост — pure ядрото живее в ./parallel-window (без DB, за тестове).
export { PARALLEL_SAFETY_MIN, windowFor, slotParallelFits };
export type { ParallelWindow, SlotNeighbor };

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

/**
 * Зарежда съседните часове (bookings) за деня на `start` като SlotNeighbor[].
 * Отпуските НЕ се включват тук — те се проверяват отделно с hasTimeOffConflict
 * при запис; за визуалния график се добавят в getDaySlots.
 */
async function dayNeighbors(resourceId: string, start: Date, excludeId?: string): Promise<SlotNeighbor[]> {
  const dayStart = new Date(start); dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 24 * 3600000);
  const rows = await db.query.bookings.findMany({
    where: (b, { and, eq, gte, lt, notInArray }) =>
      and(eq(b.resourceId, resourceId), gte(b.startAt, dayStart), lt(b.startAt, dayEnd), notInArray(b.status, ["cancelled", "no_show"])),
  });
  return rows
    .filter((b) => b.id !== excludeId)
    .map((b) => ({ start: b.startAt.getTime(), end: b.endAt.getTime(), activeMin: b.activeMin, processingMin: b.processingMin }));
}

/**
 * Сървърна проверка при ЗАПИС (staff): блокът [start, end) на нов/преместен паралелен
 * час се вписва симетрично сред съседите си (заетите времена не се блъскат, заетото на
 * единия е в престоя на другия). `excludeId` — при местене/редакция на собствен час.
 */
export async function fitsParallelSlot(
  resourceId: string, start: Date, end: Date, activeMin: number, processingMin: number, excludeId?: string,
): Promise<boolean> {
  const neighbors = await dayNeighbors(resourceId, start, excludeId);
  return slotParallelFits(start.getTime(), end.getTime(), activeMin, processingMin, neighbors);
}
