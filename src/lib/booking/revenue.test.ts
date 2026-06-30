import { describe, it, expect } from "vitest";
import { buildPeriodBounds, summarizeRevenue, type RevenueRow } from "./revenue";
import { sofiaWallToUtc } from "./time";

// Сряда, 17.06.2026, 14:00 Sofia (EEST). Понеделник тази седмица = 15.06; месец = юни.
const NOW = sofiaWallToUtc("2026-06-17", "14:00");

function row(dateStr: string, timeStr: string, status: string, price: number, priced = true): RevenueRow {
  return { startMs: sofiaWallToUtc(dateStr, timeStr).getTime(), status, price, priced };
}

describe("summarizeRevenue", () => {
  const b = buildPeriodBounds(NOW);

  it("разделя минало (earned) от бъдеще (expected) по днес/седмица/месец", () => {
    const rows: RevenueRow[] = [
      row("2026-06-17", "09:00", "confirmed", 30), // днес минал → earned today/week/month
      row("2026-06-17", "18:00", "confirmed", 50), // днес бъдещ → expected today/week/month
      row("2026-06-16", "10:00", "completed", 40), // вчера (вторник) → earned week/month
      row("2026-06-18", "11:00", "pending", 20), //   утре → expected week/month
      row("2026-06-10", "10:00", "completed", 100), // мин. седмица, този месец → earned month
      row("2026-06-17", "08:00", "cancelled", 30), // отменен → игнор
      row("2026-06-16", "09:00", "no_show", 30), //   неявил се → игнор
      row("2026-05-30", "10:00", "completed", 70), // мин. месец → извън всички
    ];
    const s = summarizeRevenue(rows, b);

    expect(s.today.earned).toEqual({ count: 1, total: 30 });
    expect(s.today.expected).toEqual({ count: 1, total: 50 });

    // седмица (пон 15 – нед 21): earned 30+40, expected 50+20
    expect(s.week.earned).toEqual({ count: 2, total: 70 });
    expect(s.week.expected).toEqual({ count: 2, total: 70 });

    // месец (юни): earned 30+40+100, expected 50+20
    expect(s.month.earned).toEqual({ count: 3, total: 170 });
    expect(s.month.expected).toEqual({ count: 2, total: 70 });
  });

  it("игнорира void статуси и бъдещи non-active часове", () => {
    const rows: RevenueRow[] = [
      row("2026-06-18", "10:00", "completed", 99), // бъдещ completed (нелогично) → пропуснат
      row("2026-06-17", "07:00", "no_show", 30),
      row("2026-06-17", "06:00", "cancelled", 30),
    ];
    const s = summarizeRevenue(rows, b);
    expect(s.month.earned.total).toBe(0);
    expect(s.month.expected.total).toBe(0);
  });

  it("брои час, започващ точно сега, като earned (граница ≤ now)", () => {
    const rows: RevenueRow[] = [row("2026-06-17", "14:00", "confirmed", 25)];
    const s = summarizeRevenue(rows, b);
    expect(s.today.earned).toEqual({ count: 1, total: 25 });
    expect(s.today.expected.count).toBe(0);
  });

  it("часове без цена (priced=false) не влизат в сумите, а в unpriced", () => {
    const rows: RevenueRow[] = [
      row("2026-06-17", "09:00", "completed", 0, false), // минал без цена → unpriced
      row("2026-06-18", "10:00", "confirmed", 0, false), // бъдещ без цена → unpriced
      row("2026-06-17", "10:00", "completed", 30, true), // нормален → earned
    ];
    const s = summarizeRevenue(rows, b);
    expect(s.today.earned).toEqual({ count: 1, total: 30 }); // безценният не е тук
    expect(s.today.unpriced).toBe(1);
    expect(s.week.unpriced).toBe(2); // и миналият, и бъдещият
    expect(s.month.earned.total).toBe(30);
    expect(s.month.unpriced).toBe(2);
  });
});
