/**
 * Човешки дати за клиентката („четвъртък, 26 ноември“, никога „2026-11-26“) и
 * търсене на първия ден със свободен час. Чисти функции върху „YYYY-MM-DD“
 * (Sofia-локална дата), без часови зони: денят от седмицата се смята по UTC
 * полунощ на същата дата, което е еднакво навсякъде.
 */

const WD_LONG = ["неделя", "понеделник", "вторник", "сряда", "четвъртък", "петък", "събота"];
const WD_SHORT = ["нд", "пн", "вт", "ср", "чт", "пт", "сб"];
const MONTHS = [
  "януари", "февруари", "март", "април", "май", "юни",
  "юли", "август", "септември", "октомври", "ноември", "декември",
];

function parts(dateStr: string): [number, number, number] {
  const [y, m, d] = dateStr.split("-").map(Number);
  return [y, m, d];
}

/** 0 = неделя … 6 = събота. */
export function weekdayOf(dateStr: string): number {
  const [y, m, d] = parts(dateStr);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Дата + n дни (минава през края на месеца и годината). */
export function addDays(dateStr: string, n: number): string {
  const [y, m, d] = parts(dateStr);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/**
 * „четвъртък, 26 ноември“ или кратко „чт, 26 ноември“. Годината се добавя само
 * ако не е текущата („четвъртък, 7 януари 2027 г.“).
 */
export function humanDay(dateStr: string, opts: { short?: boolean; currentYear?: number } = {}): string {
  const [y, m, d] = parts(dateStr);
  const wd = (opts.short ? WD_SHORT : WD_LONG)[weekdayOf(dateStr)];
  const year = opts.currentYear !== undefined && opts.currentYear !== y ? ` ${y} г.` : "";
  return `${wd}, ${d} ${MONTHS[m - 1]}${year}`;
}

/** „в неделя, 22 ноември“ / „във вторник, 24 ноември“ (с малка буква). */
export function onHumanDay(dateStr: string, currentYear?: number): string {
  const prep = weekdayOf(dateStr) === 2 ? "във" : "в";
  return `${prep} ${humanDay(dateStr, { currentYear })}`;
}

/** Първата буква главна (за начало на изречение). */
export function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

/**
 * Първият ден от `from` нататък (до `maxDays` дни, включително `from`), в който
 * `hasFree` казва, че има свободен час. Дните се питат поред и търсенето спира
 * на първия намерен; няма такъв → null.
 */
export async function findFirstFreeDay(
  from: string,
  maxDays: number,
  hasFree: (dateStr: string) => Promise<boolean>,
): Promise<string | null> {
  for (let i = 0; i < maxDays; i++) {
    const d = addDays(from, i);
    if (await hasFree(d)) return d;
  }
  return null;
}
