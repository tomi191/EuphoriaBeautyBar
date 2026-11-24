interface PriceLike {
  price: number;
  priceMax: number | null;
  priceFrom: boolean;
  currency: string;
}

/**
 * Сумата на цена, както я вижда човек (бг): цяло число без десетични («13»), иначе 2 знака с
 * десетична запетая («7,50»). Единственото място, където число става цена за очите; JSON-LD
 * остава число с точка и не минава оттук.
 */
export function formatAmount(v: number): string {
  const r = Math.round(v * 100) / 100;
  return (Number.isInteger(r) ? String(r) : r.toFixed(2)).replace(".", ",");
}

/** Цена в евро за човек: «7,50 €», «13 €». */
export function formatEuro(v: number): string {
  return `${formatAmount(v)} €`;
}

const money = formatAmount;

/**
 * Една ясна цена в записаната валута — фиксирана, диапазон (X–Y) или „от X".
 * Без втора валута в скоби (обърква клиента).
 */
export function formatServicePrice(p: PriceLike): string {
  const cur = p.currency || "лв";
  // «от» и при интервал, както ценоразписът на /uslugi («от 5–7 €»): една цена навсякъде.
  if (p.priceMax && p.priceMax > p.price) return `${p.priceFrom ? "от " : ""}${money(p.price)}–${money(p.priceMax)} ${cur}`;
  if (p.priceFrom) return `от ${money(p.price)} ${cur}`;
  return `${money(p.price)} ${cur}`;
}

/** Цената е приблизителна (зависи от дължина/състояние/продукти). */
export function priceVaries(p: { price: number; priceMax: number | null; priceFrom: boolean }): boolean {
  return p.priceFrom || (!!p.priceMax && p.priceMax > p.price);
}
