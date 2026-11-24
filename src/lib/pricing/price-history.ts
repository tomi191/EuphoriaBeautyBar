import { toEur } from "@/lib/booking/offering";

/**
 * «Предишната цена» при намаление (ЗЗП чл. 65, ал. 2): най-ниската цена на услугата за последните 30 дни.
 * Чиста функция върху редовете на дневника (price_log) за ЕДНА цена: при специалист или каталожна.
 * Смяна на цената не спира намалението сама по себе си (решение на Орион в брифа на №11, част 1): щом дневникът
 * покрива целите 30 дни, предишната цена е най-ниската от всички цени в тях, включително отпреди смяната, и
 * намаление е позволено. Докато дневникът е по-къс от 30 дни (пуснат е на 24.11.2026), частта преди него е
 * известна само ако редът не е пипан от началото на прозореца (updatedAt); иначе намаление чака датата, от която
 * дневникът или последното пипане покриват 30 дни. Цена «от» или «X до Y» не може (крайната сума не е известна).
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
  const notFixed = states.some(isNotFixed) || (current != null && isNotFixed(current));
  if (notFixed) return no("price_not_fixed", null);
  // Дневникът има всяка цена от 30-те дни: най-ниската е точна, смяната не пречи.
  if (historyComplete) return { ...base, discountAllowed: true, discountAllowedFrom: null, reason: "ok" };

  // Дневникът е по-къс от 30 дни. Частта преди него се знае само ако редът не е пипан в прозореца
  // (updatedAt се сменя и при друго, затова е горна граница за смяна на цената). Каталогът няма updatedAt.
  const hasTouch = current?.updatedAt instanceof Date;
  const touch = hasTouch
    ? Math.max(current!.updatedAt!.getTime(), current?.createdAt ? current.createdAt.getTime() : 0)
    : null;
  if (touch != null && touch <= windowStart.getTime()) {
    return { ...base, discountAllowed: true, discountAllowedFrom: null, reason: "ok" };
  }
  // Кога ще се знае: дневникът навършва 30 дни, или (ако последното пипане е преди него) 30 дни след пипането.
  const dates: number[] = [];
  if (historyFrom) dates.push(plus30(historyFrom).getTime());
  if (touch != null && (!historyFrom || touch <= historyFrom.getTime())) dates.push(touch + WINDOW_DAYS * DAY_MS);
  const from = dates.length ? new Date(Math.min(...dates)) : null;
  return no(hasTouch ? "changed_recently" : "history_short", from);
}

/**
 * Последното вдигане на цената в 30-те дни преди `at` по дневника (за подаръка: «цената не е вдигана, за да го
 * покрие»). Смените отпреди дневника (24.11.2026) не се броят: тогава промоции не е имало и не е имало какво да
 * покриват. null = не е вдигана.
 */
export function lastRaiseInWindow(input: { at: Date; entries: PriceLogEntry[] }): Date | null {
  const windowStart = input.at.getTime() - WINDOW_DAYS * DAY_MS;
  const es = input.entries
    .filter((e) => e.changedAt.getTime() <= input.at.getTime())
    .sort((a, b) => a.changedAt.getTime() - b.changedAt.getTime());
  let last: Date | null = null;
  for (let i = 1; i < es.length; i++) {
    const prev = toEur(es[i - 1].next.price, es[i - 1].next.currency);
    const next = toEur(es[i].next.price, es[i].next.currency);
    const prevMax = es[i - 1].next.priceMax ?? prev;
    const nextMax = es[i].next.priceMax ?? next;
    const raised = prev != null && next != null && (next > prev + 0.004 || (nextMax ?? 0) > (prevMax ?? 0) + 0.004);
    if (raised && es[i].changedAt.getTime() > windowStart) last = es[i].changedAt;
  }
  return last;
}
