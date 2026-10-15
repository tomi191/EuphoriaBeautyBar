/**
 * Чисти проверки на вход за Sofia-стенно време (без DB). Regex-ът сам не хваща
 * 2026-13-45 или 25:99 — а sofiaWallToUtc върху такива стойности дава Invalid Date,
 * който после стига до базата. Затова проверяваме и реалния календар.
 */
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_RE = /^\d{2}:\d{2}$/;

/** Реална календарна дата във формат YYYY-MM-DD. */
export function isValidDateStr(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Реално време HH:MM (00:00..23:59). */
export function isValidTimeStr(s: string): boolean {
  if (!TIME_RE.test(s)) return false;
  const [h, m] = s.split(":").map(Number);
  return h <= 23 && m <= 59;
}

/**
 * Час извън (новото) работно време на деня? startLabel/endLabel са Sofia „HH:MM".
 * Затворен ден = всичко е извън. Сравнението на HH:MM низове е лексикографски вярно.
 */
export function isOutsideHours(
  startLabel: string,
  endLabel: string,
  hours: { closed: boolean; openTime: string | null; closeTime: string | null },
): boolean {
  if (hours.closed || !hours.openTime || !hours.closeTime) return true;
  return startLabel < hours.openTime || endLabel > hours.closeTime;
}

/** Работно време „стесняване"? (новото е по-малко от старото). */
export function isNarrowed(
  prev: { closed: boolean; openTime: string | null; closeTime: string | null },
  next: { closed: boolean; openTime: string | null; closeTime: string | null },
): boolean {
  if (prev.closed) return false;
  if (next.closed) return true;
  if (!prev.openTime || !prev.closeTime || !next.openTime || !next.closeTime) return false;
  return next.openTime > prev.openTime || next.closeTime < prev.closeTime;
}

export function conflictMessage(n: number): string {
  return n === 1
    ? "В този интервал има 1 записан час. Първо го премести или отмени, или потвърди, че искаш да го оставиш."
    : `В този интервал има ${n} записани часа. Първо ги премести или отмени, или потвърди, че искаш да ги оставиш.`;
}
