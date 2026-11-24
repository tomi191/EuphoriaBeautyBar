import { and, eq, inArray, isNotNull, lt, ne, or, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { sofiaDateStr } from "@/lib/booking/time";
import { decidePromo, promoTotals, type PromoFacts, type PromoOutcome } from "@/lib/campaigns/booking-promo";

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
  /** Каталожният ред е видим за онлайн записване (service_items.bookableOnline). */
  catalogVisible: boolean;
  /** Изпълнителят предлага услугата (resource_services.active; няма ред → false). */
  offered: boolean;
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
    catalogVisible: item?.bookableOnline ?? false,
    offered: rs?.active ?? false,
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

// ── Цената на часа с промоцията (№11, част 3; решение 23) ──

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Q = typeof db | Tx;

export interface BookingPriceInput {
  resourceId: string;
  /** Услугите в часа, по реда на избора. */
  serviceItemIds: string[];
  startAt: Date;
  /** Телефон и имейл за «само първо посещение»; без тях проверката чака (null). */
  client?: { phone?: string | null; email?: string | null } | null;
  /** Промоцията, която клиентът е видял (адресът или последната цена): ако е свършила, редът казва «приключи». */
  promoId?: string | null;
  /** Часът, който се мести или редактира: не заема второ място и не е «по-ранен час». */
  excludeBookingId?: string | null;
  now?: Date;
}

export interface BookingPrice {
  offerings: ResolvedOffering[];
  outcome: PromoOutcome;
  /** Цената, която часът пази (€). */
  totalEur: number | null;
  /** Редовната цена в момента (€), без промоцията. */
  regularTotalEur: number | null;
  /** Промоцията, която важи (за bookings.campaign_id), иначе null. */
  campaignId: string | null;
}

/** Последните 9 цифри на телефона: +359 88…, 088… и 88… са един и същ номер. */
const phoneKey = (p: string | null | undefined) => {
  const d = (p ?? "").replace(/\D/g, "");
  return d.length >= 6 ? d.slice(-9) : null;
};

async function loadPromoFacts(q: Q, resourceId: string, serviceItemIds: string[], excludeBookingId: string | null): Promise<PromoFacts[]> {
  if (serviceItemIds.length === 0) return [];
  const rows = await q
    .select({ c: schema.campaigns, serviceItemId: schema.campaignServices.serviceItemId, newEur: schema.campaignServices.newPriceEur })
    .from(schema.campaigns)
    .innerJoin(schema.campaignServices, eq(schema.campaignServices.campaignId, schema.campaigns.id))
    .where(
      and(
        eq(schema.campaigns.resourceId, resourceId),
        inArray(schema.campaignServices.serviceItemId, serviceItemIds),
        inArray(schema.campaigns.status, ["approved", "stopped"]),
      ),
    );
  if (rows.length === 0) return [];
  const byId = new Map<string, PromoFacts>();
  for (const r of rows) {
    const f = byId.get(r.c.id) ?? {
      id: r.c.id,
      kind: r.c.kind as PromoFacts["kind"],
      status: r.c.status as PromoFacts["status"],
      startsOn: r.c.startsOn,
      endsOn: r.c.endsOn,
      slots: r.c.slots,
      firstVisitOnly: r.c.firstVisitOnly,
      gift: r.c.gift,
      services: [],
      taken: 0,
    };
    f.services.push({ serviceItemId: r.serviceItemId, newEur: r.newEur });
    byId.set(r.c.id, f);
  }
  // Местата: всички часове по промоцията (сайт, приложение, телефон) без отказаните; неявилият се остава.
  const counts = await q
    .select({ id: schema.bookings.campaignId, n: sql<number>`count(*)::int` })
    .from(schema.bookings)
    .where(
      and(
        inArray(schema.bookings.campaignId, [...byId.keys()]),
        ne(schema.bookings.status, "cancelled"),
        excludeBookingId ? ne(schema.bookings.id, excludeBookingId) : undefined,
      ),
    )
    .groupBy(schema.bookings.campaignId);
  for (const c of counts) if (c.id && byId.has(c.id)) byId.get(c.id)!.taken = Number(c.n);
  return [...byId.values()];
}

/** Първо посещение при този специалист: няма по-ранен час (без отказаните) по телефона или имейла. */
async function isFirstVisitAt(q: Q, resourceId: string, start: Date, client: BookingPriceInput["client"], excludeBookingId: string | null): Promise<boolean | null> {
  const key = phoneKey(client?.phone);
  const email = client?.email?.trim().toLowerCase() || null;
  if (!key && !email) return null;
  const who = or(
    email ? sql`lower(${schema.clients.email}) = ${email}` : undefined,
    key ? sql`right(regexp_replace(coalesce(${schema.clients.phone}, ''), '[^0-9]', '', 'g'), 9) = ${key}` : undefined,
  );
  const [row] = await q
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.bookings)
    .innerJoin(schema.clients, eq(schema.clients.id, schema.bookings.clientId))
    .where(
      and(
        eq(schema.bookings.resourceId, resourceId),
        ne(schema.bookings.status, "cancelled"),
        lt(schema.bookings.startAt, start),
        excludeBookingId ? ne(schema.bookings.id, excludeBookingId) : undefined,
        who,
      ),
    );
  return Number(row?.n ?? 0) === 0;
}

/**
 * ЕДИНСТВЕНОТО място, където се решава цената на нов час: редовната цена от resolveOffering за всяка услуга и
 * промоцията, ако важи (decidePromo). Сайтът, «Нов час» в приложението и администрацията минават оттук.
 * При запис се вика вътре в транзакцията след lockPromoSlots, за да не вземат двама последното място.
 */
export async function resolveBookingPrice(input: BookingPriceInput, q: Q = db): Promise<BookingPrice> {
  const ids = input.serviceItemIds;
  const offerings = await Promise.all(ids.map((id) => resolveOffering(input.resourceId, id)));
  const exclude = input.excludeBookingId ?? null;
  const promos = await loadPromoFacts(q, input.resourceId, ids, exclude);
  const isFirstVisit = promos.some((p) => p.firstVisitOnly)
    ? await isFirstVisitAt(q, input.resourceId, input.startAt, input.client, exclude)
    : null;
  const outcome = decidePromo({
    promos,
    serviceItemIds: ids,
    day: sofiaDateStr(input.startAt),
    today: sofiaDateStr(input.now ?? new Date()),
    isFirstVisit,
    promoId: input.promoId ?? null,
  });
  const totals = promoTotals(
    ids.map((id, i) => ({ serviceItemId: id, regularEur: offerings[i].priceEur })),
    outcome,
  );
  return { offerings, outcome, ...totals, campaignId: outcome.state === "applied" ? outcome.campaignId : null };
}

/**
 * Заключва местата на промоциите с лимит за тези услуги до края на транзакцията (pg_advisory_xact_lock): вторият
 * запис чака първия и после брои и неговия час. Ключовете са подредени, за да няма взаимно чакане.
 */
export async function lockPromoSlots(tx: Tx, resourceId: string, serviceItemIds: string[]): Promise<void> {
  if (serviceItemIds.length === 0) return;
  const rows = await tx
    .selectDistinct({ id: schema.campaigns.id })
    .from(schema.campaigns)
    .innerJoin(schema.campaignServices, eq(schema.campaignServices.campaignId, schema.campaigns.id))
    .where(
      and(
        eq(schema.campaigns.resourceId, resourceId),
        eq(schema.campaigns.status, "approved"),
        isNotNull(schema.campaigns.slots),
        inArray(schema.campaignServices.serviceItemId, serviceItemIds),
      ),
    );
  for (const id of rows.map((r) => r.id).sort()) {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${"campaign-slots:" + id}))`);
  }
}
