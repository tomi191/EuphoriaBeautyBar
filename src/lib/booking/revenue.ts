/**
 * Pure ядро за оборот статистиката — DST-safe граници на периоди + агрегация, без DB
 * (изолирано за unit тестове). Моделът „Изкарано + Очаквано" не зависи от ръчно
 * маркиране на часовете: реализираното се извежда от това, че часът е минал и не е
 * отменен/неявил се, а очакваното — от бъдещите потвърдени часове.
 */
import { sofiaDateStr, sofiaWallToUtc, sofiaWeekday } from "./time";

export interface RevenueBucket {
  count: number;
  total: number; // €
}
export interface RevenuePeriod {
  earned: RevenueBucket; // минали часове (не отменени/неявили се) — реализирано
  expected: RevenueBucket; // бъдещи потвърдени/чакащи — очаквано
  unpriced: number; // часове без въведена цена — броят се само за прозрачност, НЕ в сумите
}
export interface RevenueStats {
  today: RevenuePeriod;
  week: RevenuePeriod;
  month: RevenuePeriod;
}

/** Един час, сведен до нужното за оборота (цената вече е резолюрната — €). */
export interface RevenueRow {
  startMs: number; // startAt в ms UTC
  status: string;
  price: number;
  /** Има ли реална цена. false = липсва (priceEur и fallback) → не влиза в сумите, само се брои. */
  priced: boolean;
}

export interface PeriodBounds {
  nowMs: number;
  todayStartMs: number;
  todayEndMs: number;
  weekStartMs: number;
  weekEndMs: number;
  monthStartMs: number;
  monthEndMs: number;
}

// Статуси, които НЕ носят пари: отменен и неявил се. Всичко друго е реален час.
const VOID_STATUSES = new Set(["cancelled", "no_show"]);
// Бъдещ час се брои за „очаквано" само ако още е активен (потвърден/чакащ).
const EXPECTED_STATUSES = new Set(["pending", "confirmed"]);

/** YYYY-MM-DD + n дни (обед-UTC аритметика → без DST изместване на деня). */
function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  dt.setUTCDate(dt.getUTCDate() + n);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

/** Граници на днес / седмица (понеделник–неделя) / месец в Sofia, DST-safe, от текущия момент. */
export function buildPeriodBounds(now: Date): PeriodBounds {
  const todayStr = sofiaDateStr(now);
  const daysSinceMonday = (sofiaWeekday(todayStr) + 6) % 7;
  const mondayStr = addDays(todayStr, -daysSinceMonday);
  const [y, mo] = todayStr.split("-").map(Number);
  const nextMonthStr = mo === 12 ? `${y + 1}-01-01` : `${y}-${String(mo + 1).padStart(2, "0")}-01`;
  return {
    nowMs: now.getTime(),
    todayStartMs: sofiaWallToUtc(todayStr, "00:00").getTime(),
    todayEndMs: sofiaWallToUtc(addDays(todayStr, 1), "00:00").getTime(),
    weekStartMs: sofiaWallToUtc(mondayStr, "00:00").getTime(),
    weekEndMs: sofiaWallToUtc(addDays(mondayStr, 7), "00:00").getTime(),
    monthStartMs: sofiaWallToUtc(`${todayStr.slice(0, 7)}-01`, "00:00").getTime(),
    monthEndMs: sofiaWallToUtc(nextMonthStr, "00:00").getTime(),
  };
}

/** Форматира € сума: цели числа без стотинки, иначе 2 знака, десетична запетая (bg). */
export function formatEur(v: number): string {
  const r = Math.round(v * 100) / 100;
  return (Number.isInteger(r) ? String(r) : r.toFixed(2)).replace(".", ",");
}

function emptyPeriod(): RevenuePeriod {
  return { earned: { count: 0, total: 0 }, expected: { count: 0, total: 0 }, unpriced: 0 };
}

/**
 * Агрегира часове в оборот по днес/седмица/месец, всеки разделен на:
 *  - earned: минал час (startMs ≤ now), който не е отменен/неявил се — реализирано;
 *  - expected: бъдещ потвърден/чакащ час — очаквано.
 * Часовете извън всички периоди, с void статус, или бъдещи non-active се игнорират.
 */
export function summarizeRevenue(rows: RevenueRow[], b: PeriodBounds): RevenueStats {
  const stats: RevenueStats = { today: emptyPeriod(), week: emptyPeriod(), month: emptyPeriod() };
  for (const r of rows) {
    if (VOID_STATUSES.has(r.status)) continue;
    const past = r.startMs <= b.nowMs;
    const kind: "earned" | "expected" | null = past
      ? "earned"
      : EXPECTED_STATUSES.has(r.status)
        ? "expected"
        : null;
    if (!kind) continue; // бъдещ arrived/completed (нелогично за бъдеще) — пропусни
    const inToday = r.startMs >= b.todayStartMs && r.startMs < b.todayEndMs;
    const inWeek = r.startMs >= b.weekStartMs && r.startMs < b.weekEndMs;
    const inMonth = r.startMs >= b.monthStartMs && r.startMs < b.monthEndMs;
    // Час без въведена цена: не изкривява сумите (би бил тих 0 €) — броим го отделно,
    // за да е видимо, че оборотът е непълен (импортирани/недовършени часове).
    if (!r.priced) {
      if (inToday) stats.today.unpriced += 1;
      if (inWeek) stats.week.unpriced += 1;
      if (inMonth) stats.month.unpriced += 1;
      continue;
    }
    const apply = (p: RevenuePeriod) => {
      p[kind].count += 1;
      p[kind].total += r.price;
    };
    if (inToday) apply(stats.today);
    if (inWeek) apply(stats.week);
    if (inMonth) apply(stats.month);
  }
  // Закръгляне до стотинки (избягва float дрейф при сумиране).
  for (const p of [stats.today, stats.week, stats.month]) {
    p.earned.total = Math.round(p.earned.total * 100) / 100;
    p.expected.total = Math.round(p.expected.total * 100) / 100;
  }
  return stats;
}
