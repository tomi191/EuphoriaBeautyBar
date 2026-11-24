import { formatServicePrice, priceVaries } from "./price";

interface PricedOffering {
  price: number;
  priceMax: number | null;
  priceFrom: boolean;
  currency: string;
}

/**
 * „45 мин“, „1 ч“, „1 ч 15 мин“, „2 ч 10 мин“: блокираното време, без „~“. Числото и мярката
 * са с неразделим интервал, за да не се чупи «1» / «ч» на края на реда (Bulgarian Cyrillic UX).
 */
export function formatDurationShort(min: number): string {
  if (min < 60) return `${min}\u00a0мин`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}\u00a0ч ${m}\u00a0мин` : `${h}\u00a0ч`;
}

/**
 * Сборът на цените на избраните услуги при избраната специалистка. Ако поне една
 * е „от“ или интервал, сборът е „от {сбор на долните граници}“; иначе точният сбор.
 */
export function sumPriceLabel(offerings: PricedOffering[]): string {
  const total = offerings.reduce((s, o) => s + o.price, 0);
  return formatServicePrice({
    price: total,
    priceMax: null,
    priceFrom: offerings.some((o) => priceVaries(o)),
    currency: offerings[0]?.currency ?? "€",
  });
}
