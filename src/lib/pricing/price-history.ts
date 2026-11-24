import { toEur } from "@/lib/booking/offering";

/**
 * «Предишната цена» при намаление (ЗЗП чл. 65, ал. 2): най-ниската цена на услугата за последните 30 дни.
 * Чиста функция върху редовете на дневника (price_log) за ЕДНА цена: при специалист или каталожна.
 * Правилата на кампаниите (доклад 2026-11-24-manager-кампании-правила.md, раздел 3) са по-строги от закона:
 * цена, добавена или сменена в последните 30 дни, не може да има намаление (може подарък); цена «от» или
 * «X до Y» също не може (крайната сума не е известна).
 */

export const WINDOW_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface PriceState {
  price: number;
  priceMax: number | null;
  priceFrom: boolean;
  currency: string;
}

export interface PriceLogEntry {
  event: "start" | "insert" | "update";
  changedAt: Date;
  next: PriceState;
}

export interface CurrentPrice extends PriceState {
  /** Кога е създаден редът (resource_services); каталогът няма такава колона. */
  createdAt?: Date | null;
  /** Последна смяна на реда (resource_services). undefined = няма колона (каталогът). */
  updatedAt?: Date | null;
}

export type LowestPriceReason =
  | "ok" // може намаление; предишната цена е lowestEur
  | "changed_recently" // цената е добавена или сменена в последните 30 дни
  | "history_short" // дневникът е по-къс от 30 дни и няма updatedAt, по което да се съди
  | "price_not_fixed" // в 30-те дни е имало цена «от» или «X до Y»
  | "no_data";

export interface LowestPriceResult {
  /** Най-ниската цена в € в известната част от 30-те дни; null без данни. */
  lowestEur: number | null;
  /** От кога дневникът има тази цена (първият му ред); null = няма ред. */
  historyFrom: Date | null;
  /** Дневникът покрива целите 30 дни преди `at`. */
  historyComplete: boolean;
  /** Последното добавяне или смяна на цената, което знаем (дневник или updatedAt). */
  lastChangeAt: Date | null;
  discountAllowed: boolean;
  /** Кога ще може намаление, ако сега не може и датата е известна. */
  discountAllowedFrom: Date | null;
  reason: LowestPriceReason;
}

const isNotFixed = (s: PriceState) => s.priceFrom || (s.priceMax != null && s.priceMax > s.price);
const plus30 = (d: Date) => new Date(d.getTime() + WINDOW_DAYS * DAY_MS);

export function lowestPriceInWindow(input: {
  at: Date;
  entries: PriceLogEntry[];
  current: CurrentPrice | null;
}): LowestPriceResult {
  const { at, current } = input;
  const windowStart = new Date(at.getTime() - WINDOW_DAYS * DAY_MS);
  const es = input.entries
    .filter((e) => e.changedAt.getTime() <= at.getTime())
    .sort((a, b) => a.changedAt.getTime() - b.changedAt.getTime());

  const historyFrom = es[0]?.changedAt ?? null;
  const historyComplete = historyFrom != null && historyFrom.getTime() <= windowStart.getTime();

  // Цените, които са важали в 30-те дни: тази в началото на прозореца и всяка нова след него.
  let states: PriceState[];
  if (historyComplete) {
    const before = es.filter((e) => e.changedAt.getTime() <= windowStart.getTime());
    const inside = es.filter((e) => e.changedAt.getTime() > windowStart.getTime());
    states = [before[before.length - 1].next, ...inside.map((e) => e.next)];
  } else {
    states = es.map((e) => e.next);
    if (states.length === 0 && current) states = [current];
  }

  const eur = states.map((s) => toEur(s.price, s.currency)).filter((v): v is number => v != null);
  const lowestEur = eur.length ? Math.min(...eur) : null;

  // Последната смяна: добавяне/смяна от дневника (началните редове не са смяна) и updatedAt/createdAt на реда.
  const stamps = es.filter((e) => e.event !== "start").map((e) => e.changedAt);
  if (current?.updatedAt && current.updatedAt.getTime() <= at.getTime()) stamps.push(current.updatedAt);
  if (current?.createdAt && current.createdAt.getTime() <= at.getTime()) stamps.push(current.createdAt);
  const lastChangeAt = stamps.length ? new Date(Math.max(...stamps.map((d) => d.getTime()))) : null;

  const base = { lowestEur, historyFrom, historyComplete, lastChangeAt };
  const no = (reason: LowestPriceReason, from: Date | null): LowestPriceResult => ({
    ...base,
    discountAllowed: false,
    discountAllowedFrom: from,
    reason,
  });

  if (lowestEur == null) return no("no_data", null);
  if (lastChangeAt && lastChangeAt.getTime() > windowStart.getTime()) return no("changed_recently", plus30(lastChangeAt));
  // Дневникът е по-къс от 30 дни: съдим по updatedAt; каталогът го няма → чака 30 дни дневник.
  if (!historyComplete && !(current?.updatedAt instanceof Date)) {
    return no("history_short", historyFrom ? plus30(historyFrom) : null);
  }
  const notFixed = states.some(isNotFixed) || (current != null && isNotFixed(current));
  if (notFixed) return no("price_not_fixed", null);
  return { ...base, discountAllowed: true, discountAllowedFrom: null, reason: "ok" };
}
