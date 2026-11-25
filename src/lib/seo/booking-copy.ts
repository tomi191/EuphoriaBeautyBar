import { KIND_BY_SLUG } from "@/lib/booking/kind";

/**
 * Текстът за записването на ноктите (решение 43, 25.11.2026): «онлайн» само ако услугата има
 * специалист с онлайн график; иначе «по телефона» с номера. Сменя се сам, щом специалистът пусне график.
 * Козметиката още не е тук: чака своето решение.
 */
export const PHONE_COPY_SLUGS = new Set(["manikyur-i-pedikyur"]);

/** Страницата казва «по телефона» вместо «онлайн»: категорията е в списъка и услугата (или никоя в нея) няма онлайн запис. */
export function phoneOnlyCopy(categorySlug: string, online: boolean): boolean {
  return PHONE_COPY_SLUGS.has(categorySlug) && !online;
}

const BOOK_RE = /\{book:([^|}]*)\|([^}]*)\}/g;

/** «{book:<текст при онлайн>|<текст при телефон>}» → едното от двете. */
export function fillBooking(text: string, online: boolean): string {
  return text.replace(BOOK_RE, (_m, onlineText: string, phoneText: string) => (online ? onlineText : phoneText));
}

/**
 * Услугите, които днес се записват онлайн. Същото правило като формата в /zapazi-chas
 * (public-booking-form.tsx, isOnlineBookable): има готов изпълнител от същия вид, който или няма
 * свои оферти (каталожният ред е онлайн по подразбиране), или има активна оферта за услугата с
 * включен онлайн запис. `offers` са само активните, `readyResources` само активните и готовите.
 */
export function onlineItemIds(
  items: { id: string; categoryId: string }[],
  categories: { id: string; slug: string }[],
  offers: { serviceItemId: string; resourceId: string; onlineBookable: boolean }[],
  readyResources: { id: string; kind: string }[],
): Set<string> {
  const slugById = new Map(categories.map((c) => [c.id, c.slug]));
  const own = new Map<string, Map<string, boolean>>();
  for (const o of offers) {
    const m = own.get(o.resourceId) ?? new Map<string, boolean>();
    m.set(o.serviceItemId, o.onlineBookable);
    own.set(o.resourceId, m);
  }
  const out = new Set<string>();
  for (const i of items) {
    const kind = KIND_BY_SLUG[slugById.get(i.categoryId) ?? ""];
    if (!kind) continue;
    const online = readyResources.some((r) => {
      if (r.kind !== kind) return false;
      const m = own.get(r.id);
      return m ? m.get(i.id) === true : true;
    });
    if (online) out.add(i.id);
  }
  return out;
}
