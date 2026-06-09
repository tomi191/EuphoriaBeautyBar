interface PriceLike {
  price: number;
  priceMax: number | null;
  priceFrom: boolean;
  currency: string;
}

/** Форматира пари: цели числа без стотинки, иначе 2 знака с десетична запетая (бг). */
function money(v: number): string {
  const r = Math.round(v * 100) / 100;
  return (Number.isInteger(r) ? String(r) : r.toFixed(2)).replace(".", ",");
}

/**
 * Една ясна цена в записаната валута — фиксирана, диапазон (X–Y) или „от X".
 * Без втора валута в скоби (обърква клиента).
 */
export function formatServicePrice(p: PriceLike): string {
  const cur = p.currency || "лв";
  if (p.priceMax && p.priceMax > p.price) return `${money(p.price)}–${money(p.priceMax)} ${cur}`;
  if (p.priceFrom) return `от ${money(p.price)} ${cur}`;
  return `${money(p.price)} ${cur}`;
}

/** Цената е приблизителна (зависи от дължина/състояние/продукти). */
export function priceVaries(p: { price: number; priceMax: number | null; priceFrom: boolean }): boolean {
  return p.priceFrom || (!!p.priceMax && p.priceMax > p.price);
}
