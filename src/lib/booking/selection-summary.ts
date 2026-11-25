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

interface TimedOffering {
  durationMin: number;
  bufferMin: number;
  activeMin?: number;
  processingMin?: number;
}

/**
 * Няколко услуги в един час (решение 4): времето е сборът, паузата е една (най-дългата), не по една след
 * всяка услуга. Престоят остава: първата услуга с престой (по реда на избора) дава фазите на часа; всичко
 * преди нея е работа с клиента и влиза в активното време, всичко след нея е след престоя.
 */
export function combineServices(list: TimedOffering[]): { durationMin: number; bufferMin: number; activeMin: number; processingMin: number } {
  const durationMin = list.reduce((s, o) => s + o.durationMin, 0);
  const bufferMin = list.length ? Math.max(...list.map((o) => o.bufferMin)) : 0;
  const i = list.findIndex((o) => (o.processingMin ?? 0) > 0);
  if (i < 0) return { durationMin, bufferMin, activeMin: 0, processingMin: 0 };
  const before = list.slice(0, i).reduce((s, o) => s + o.durationMin, 0);
  return { durationMin, bufferMin, activeMin: before + (list[i].activeMin ?? 0), processingMin: list[i].processingMin ?? 0 };
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
