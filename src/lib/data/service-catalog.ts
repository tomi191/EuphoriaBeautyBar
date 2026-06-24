import { db } from "@/lib/db";
import type { ServiceCategory, ServiceItem, Currency } from "@/lib/data/services";
import { KIND_BY_SLUG } from "@/lib/booking/kind";

/**
 * Презентационни/SEO полета, които НЕ са цени и не се менят от admin —
 * пазят се статично по slug. Всичко друго (текстове, групи, цени) идва от БД.
 */
const PRESENTATION: Record<string, { seoTitle: string; metaTitle: string; metaDescription: string; popular: string[]; heroImage?: string }> = {
  "frizorski-uslugi": {
    seoTitle: "Фризьорски услуги във Варна — стил и качество от професионалисти",
    metaTitle: "Фризьорски салон във Варна, кв. Левски",
    metaDescription:
      "Фризьорски салон в кв. Левски, Варна — подстригване, боядисване, балаяж, кичури и официални прически с Montibello и Goldwell. Запази час онлайн.",
    popular: ["Балаяж", "Кичури на фолио", "Подстригване", "Официална прическа", "Корекция на цвят"],
  },
  "frizorski-terapii": {
    seoTitle: "Фризьорски терапии във Варна — възстановяване, хидратация и блясък",
    metaTitle: "Фризьорски терапии за коса във Варна, кв. Левски",
    metaDescription:
      "Възстановяващи терапии за коса във Варна, кв. Левски — кератин Kerasilk, Nashi Argan, ламеларна вода и минерали. Запази час онлайн в Euphoria.",
    popular: ["Kerasilk кератин", "Nashi Argan", "Ламеларна вода", "Минерални ампули"],
    // Override на DB снимката (старата беше AI-генерирана спа стая, грешна тема).
    // Фотореалистична снимка на здрава третирана коса (KIE gpt-image-2), тема: терапия за коса.
    heroImage: "/images/services/frizorski-terapii-hero.png",
  },
  "manikyur-i-pedikyur": {
    seoTitle: "Маникюр и педикюр във Варна — грижа за ръцете и краката ти",
    metaTitle: "Маникюр и педикюр във Варна, кв. Левски",
    metaDescription:
      "Маникюр, гел лак и педикюр в кв. Левски, Варна — класически, френски, медицински педикюр и кератинова терапия за нокти. Запази час онлайн без обаждане.",
    popular: ["Гел маникюр", "Френски / омбре", "Класически педикюр", "Кератинова терапия", "Медицински педикюр"],
  },
  kozmetika: {
    seoTitle: "Козметични услуги във Варна — грижа за кожата и лицето ти",
    metaTitle: "Козметичен салон във Варна, кв. Левски",
    metaDescription:
      "Козметичен салон в кв. Левски, Варна — Hydra Facial, микронидлинг, ламиниране на мигли и вежди, пилинги с GIGI и Esthemax. Запази час онлайн.",
    popular: ["Hydra Facial", "Микронидлинг", "BIOREPEELCL3 пилинг", "GOYUKI японски лифтинг", "Ламиниране мигли"],
  },
};

const VALID_ICONS = ["scissors", "sparkles", "hand-heart", "flower"] as const;
type Icon = (typeof VALID_ICONS)[number];

function toItem(i: { name: string; price: number; priceMax: number | null; priceFrom: boolean; currency: string; duration: string | null; description: string | null }): ServiceItem {
  return {
    name: i.name,
    price: i.price,
    priceFrom: i.priceFrom,
    priceMax: i.priceMax ?? undefined,
    currency: (i.currency === "€" ? "€" : "лв") as Currency,
    duration: i.duration ?? undefined,
    description: i.description ?? undefined,
  };
}

/** Уникални стойности, запазвайки реда. */
function uniq(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) if (!seen.has(v)) { seen.add(v); out.push(v); }
  return out;
}

/**
 * Чете каталога услуги от БД и го сглобява в структурата, която страниците
 * очакват (групирано по group_title). Цените, текстовете и продължителностите
 * идват от admin → промяна там се отразява на сайта (с revalidatePath).
 */
interface PriceParts {
  price: number;
  priceMax: number | null;
  priceFrom: boolean;
}

/**
 * Публичната цена за услуга = диапазон/„от" across изпълнителите, които реално я
 * предлагат. Базовата каталожна цена влиза САМО ако в този kind има „не-curated"
 * изпълнител (който таксува по каталога) — иначе показваме само реалните оферти.
 */
function publicPrice(base: PriceParts, offers: PriceParts[], includeBase: boolean): PriceParts {
  const lows: number[] = [];
  const highs: number[] = [];
  let anyFrom = false;
  const consider = (p: PriceParts) => {
    lows.push(p.price);
    highs.push(p.priceMax && p.priceMax > p.price ? p.priceMax : p.price);
    anyFrom = anyFrom || p.priceFrom;
  };
  if (includeBase) consider(base);
  for (const o of offers) consider(o);
  if (lows.length === 0) consider(base); // защита: услуга без оферти → базова цена
  const low = Math.min(...lows);
  const high = Math.max(...highs);
  return { price: low, priceMax: high > low ? high : null, priceFrom: anyFrom };
}

export async function getServiceCatalog(): Promise<ServiceCategory[]> {
  const [cats, items, offers, resources] = await Promise.all([
    db.query.serviceCategories.findMany({
      where: (c, { eq }) => eq(c.active, true),
      orderBy: (c, { asc }) => [asc(c.sortOrder)],
    }),
    db.query.serviceItems.findMany({ orderBy: (s, { asc }) => [asc(s.sortOrder)] }),
    db.query.resourceServices.findMany({ where: (rs, { eq }) => eq(rs.active, true) }),
    db.query.resources.findMany({ where: (r, { eq }) => eq(r.active, true), columns: { id: true, kind: true } }),
  ]);

  // Оферти по услуга + брой оферти на изпълнител (за curation статуса).
  const offersByItem = new Map<string, PriceParts[]>();
  const offerCount = new Map<string, number>();
  for (const o of offers) {
    const arr = offersByItem.get(o.serviceItemId);
    const parts: PriceParts = { price: o.price, priceMax: o.priceMax, priceFrom: o.priceFrom };
    if (arr) arr.push(parts);
    else offersByItem.set(o.serviceItemId, [parts]);
    offerCount.set(o.resourceId, (offerCount.get(o.resourceId) ?? 0) + 1);
  }
  // Kind-ове с поне един „не-curated" изпълнител (0 оферти → таксува по каталога).
  const kindHasBaseSeller = new Set<string>();
  for (const r of resources) if ((offerCount.get(r.id) ?? 0) === 0) kindHasBaseSeller.add(r.kind);

  return cats.map((c) => {
    const kind = KIND_BY_SLUG[c.slug];
    const includeBase = kind ? kindHasBaseSeller.has(kind) : true;
    const catItems = items.filter((i) => i.categoryId === c.id);
    const itemToOpt = (i: (typeof items)[number]): ServiceItem => {
      const pp = publicPrice({ price: i.price, priceMax: i.priceMax, priceFrom: i.priceFrom }, offersByItem.get(i.id) ?? [], includeBase);
      return toItem({
        name: i.name,
        price: pp.price,
        priceMax: pp.priceMax,
        priceFrom: pp.priceFrom,
        currency: i.currency,
        duration: i.duration,
        description: i.description,
      });
    };
    const groupTitles = uniq(catItems.map((i) => i.groupTitle));
    const groups = groupTitles.map((title) => ({
      title,
      items: catItems.filter((i) => i.groupTitle === title).map(itemToOpt),
    }));
    const pres = PRESENTATION[c.slug];
    const icon = (VALID_ICONS.includes(c.icon as Icon) ? c.icon : "sparkles") as Icon;

    return {
      slug: c.slug,
      title: c.title,
      shortTitle: c.shortTitle,
      tagline: c.tagline,
      description: c.description,
      longDescription: c.longDescription,
      icon,
      heroImage: pres?.heroImage ?? c.heroImage,
      seoTitle: pres?.seoTitle ?? `${c.title} във Варна`,
      metaTitle: pres?.metaTitle ?? `${c.title} във Варна`,
      metaDescription: pres?.metaDescription ?? c.description,
      popular: pres?.popular ?? catItems.slice(0, 5).map((i) => i.name),
      groups,
      // „Препоръчани" за визитката на категорията — диапазонни цени across изпълнители.
      featured: catItems.slice(0, 3).map(itemToOpt),
    } satisfies ServiceCategory;
  });
}

/** Една категория по slug (или undefined). */
export async function getCatalogCategory(slug: string): Promise<ServiceCategory | undefined> {
  const all = await getServiceCatalog();
  return all.find((c) => c.slug === slug);
}
