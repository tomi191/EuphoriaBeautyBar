/**
 * Решение 28 (24.11.2026): цена с центове се закръглява до най-близкото кратно на 0,50 €; точно по средата
 * (x,25 и x,75) нагоре. Смята се в центове, за да не пречат дробите на real (float4) в базата.
 */
export function roundToHalfEuro(value: number): number {
  const cents = Math.round(value * 100);
  return (Math.floor((cents + 25) / 50) * 50) / 100;
}

/** Има ли цената центове, различни от 0 и 50. */
export function needsRounding(value: number | null | undefined): boolean {
  if (value == null) return false;
  return Math.round(value * 100) % 50 !== 0;
}

export interface RoundableRow {
  price: number;
  priceMax: number | null;
  currency: string;
}

/**
 * Новата цена за ред в евро; null, ако няма какво да се закръгля. Редовете в лева не се пипат тук
 * (показват се в лева без центове; смяната им на евро е отделно решение).
 */
export function roundRow(row: RoundableRow): { price: number; priceMax: number | null } | null {
  if (row.currency !== "€") return null;
  if (!needsRounding(row.price) && !needsRounding(row.priceMax)) return null;
  return {
    price: roundToHalfEuro(row.price),
    priceMax: row.priceMax == null ? null : roundToHalfEuro(row.priceMax),
  };
}
