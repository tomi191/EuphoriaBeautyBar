import type { ServiceCategory, ServiceItem } from "@/lib/data/services";
import { formatServicePrice } from "@/lib/booking/price";

/**
 * Цени и минути от ценоразписа в текст на страница, за да не остаряват (№12, решение 42).
 * «{price:Име}» → «от 77 €» / «25 €» (formatServicePrice); «{Price:Име}» → същото с главна буква;
 * «{min:Име}» → минутите на часа в записването. Името е точното име на услугата в каталога.
 * Липсва ли услугата (или минутите ѝ), връща null: текстът не се показва, цена не се измисля.
 */
const TOKEN_RE = /\{(price|Price|min):([^}]+)\}/g;

export function fillPrices(text: string, categories: ServiceCategory[]): string | null {
  const items = new Map<string, ServiceItem>();
  for (const c of categories) for (const g of c.groups) for (const i of g.items) items.set(i.name, i);
  let missing = false;
  const out = text.replace(TOKEN_RE, (_m, kind: string, name: string) => {
    const item = items.get(name);
    if (!item) {
      missing = true;
      return "";
    }
    if (kind === "min") {
      if (!item.durationMin) missing = true;
      return String(item.durationMin ?? "");
    }
    const price = formatServicePrice({
      price: item.price,
      priceMax: item.priceMax ?? null,
      priceFrom: !!item.priceFrom,
      currency: item.currency,
    });
    return kind === "Price" ? price.charAt(0).toUpperCase() + price.slice(1) : price;
  });
  return missing ? null : out;
}
