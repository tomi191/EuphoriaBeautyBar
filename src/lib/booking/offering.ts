import { db } from "@/lib/db";

/** Фиксиран курс по валутен борд: 1 € = 1.95583 лв. */
export const BGN_PER_EUR = 1.95583;

/**
 * Нормализира цена към € за snapshot/оборот. Ако източникът е в „лв", конвертира по
 * фиксирания курс — иначе левова стойност би влязла числово като € (надут оборот).
 * priceEur по дефиниция е в евро; всичко, което го захранва, минава оттук.
 */
export function toEur(price: number | null | undefined, currency: string | null | undefined): number | null {
  if (price == null) return null;
  return currency === "лв" ? Math.round((price / BGN_PER_EUR) * 100) / 100 : price;
}

export interface ResolvedOffering {
  /** Собствена (resource_services) цена в €, иначе каталожна, иначе null. Винаги € (лв→€ конвертирано). */
  priceEur: number | null;
  durationMin: number;
  bufferMin: number;
  /** Активно/престой време — характеристика на услугата (глобално, от каталога). */
  activeMin: number;
  processingMin: number;
  /** Приема ли изпълнителят онлайн запис за услугата (resource_services). */
  onlineBookable: boolean;
  /** Има ли изобщо собствена оферта (false → само каталожен fallback). */
  hasOwnOffering: boolean;
}

/**
 * ЕДИНСТВЕНИЯТ източник на истина за офертата на изпълнител за услуга. Собствената
 * цена (resource_services — това, което изпълнителят въвежда от PWA-то) винаги печели
 * пред каталожната; резолюрва се дори услугата да е спряна (active=false) — цената не
 * зависи от видимостта в ценоразписа. Активното/престой времето е характеристика на
 * услугата → идва от каталога. Всички пътища за създаване на час (staff/online/admin)
 * снапшот-ват priceEur оттук — иначе дивергират (историческият бъг: онлайн/admin
 * снимаха каталожната вместо собствената цена).
 */
export async function resolveOffering(resourceId: string, serviceItemId: string): Promise<ResolvedOffering> {
  const [rs, item] = await Promise.all([
    db.query.resourceServices.findFirst({
      where: (r, { and, eq }) => and(eq(r.resourceId, resourceId), eq(r.serviceItemId, serviceItemId)),
    }),
    db.query.serviceItems.findFirst({ where: (s, { eq }) => eq(s.id, serviceItemId) }),
  ]);
  const priceEur = toEur(rs?.price, rs?.currency) ?? toEur(item?.price, item?.currency);
  return {
    priceEur,
    durationMin: rs?.durationMin ?? item?.durationMin ?? 30,
    bufferMin: rs?.bufferMin ?? item?.bufferMin ?? 10,
    activeMin: item?.activeMin ?? 0,
    processingMin: item?.processingMin ?? 0,
    onlineBookable: rs?.onlineBookable ?? true,
    hasOwnOffering: !!rs,
  };
}

/**
 * Сумарна снапшот-цена (€) за комбиниран запис (няколко услуги наведнъж). Всяка услуга
 * се резолюрва по собствената цена на изпълнителя. Връща null само ако НИТО една услуга
 * няма резолюрна цена (иначе сборът от наличните — по-честно от „0 € в оборота").
 */
export async function sumOfferingPrices(resourceId: string, serviceItemIds: string[]): Promise<number | null> {
  if (serviceItemIds.length === 0) return null;
  const resolved = await Promise.all(serviceItemIds.map((id) => resolveOffering(resourceId, id)));
  const prices = resolved.map((r) => r.priceEur).filter((p): p is number => p != null);
  if (prices.length === 0) return null;
  return Math.round(prices.reduce((a, b) => a + b, 0) * 100) / 100;
}
