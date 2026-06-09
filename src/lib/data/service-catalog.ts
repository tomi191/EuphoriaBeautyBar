import { db } from "@/lib/db";
import type { ServiceCategory, ServiceItem, Currency } from "@/lib/data/services";

/**
 * Презентационни/SEO полета, които НЕ са цени и не се менят от admin —
 * пазят се статично по slug. Всичко друго (текстове, групи, цени) идва от БД.
 */
const PRESENTATION: Record<string, { seoTitle: string; popular: string[] }> = {
  "frizorski-uslugi": {
    seoTitle: "Фризьорски услуги във Варна — стил и качество от професионалисти",
    popular: ["Балаяж", "Кичури на фолио", "Подстригване", "Официална прическа", "Корекция на цвят"],
  },
  "frizorski-terapii": {
    seoTitle: "Фризьорски терапии във Варна — възстановяване, хидратация и блясък",
    popular: ["Kerasilk кератин", "Nashi Argan", "Ламеларна вода", "Минерални ампули"],
  },
  "manikyur-i-pedikyur": {
    seoTitle: "Маникюр и педикюр във Варна — грижа за ръцете и краката ти",
    popular: ["Гел маникюр", "Френски / омбре", "Класически педикюр", "Кератинова терапия", "Медицински педикюр"],
  },
  kozmetika: {
    seoTitle: "Козметични услуги във Варна — грижа за кожата и лицето ти",
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
export async function getServiceCatalog(): Promise<ServiceCategory[]> {
  const [cats, items] = await Promise.all([
    db.query.serviceCategories.findMany({
      where: (c, { eq }) => eq(c.active, true),
      orderBy: (c, { asc }) => [asc(c.sortOrder)],
    }),
    db.query.serviceItems.findMany({ orderBy: (s, { asc }) => [asc(s.sortOrder)] }),
  ]);

  return cats.map((c) => {
    const catItems = items.filter((i) => i.categoryId === c.id);
    const groupTitles = uniq(catItems.map((i) => i.groupTitle));
    const groups = groupTitles.map((title) => ({
      title,
      items: catItems.filter((i) => i.groupTitle === title).map(toItem),
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
      heroImage: c.heroImage,
      seoTitle: pres?.seoTitle ?? `${c.title} във Варна`,
      popular: pres?.popular ?? catItems.slice(0, 5).map((i) => i.name),
      groups,
      // „Препоръчани" за визитката на категорията — първите няколко услуги с актуални цени.
      featured: catItems.slice(0, 3).map(toItem),
    } satisfies ServiceCategory;
  });
}

/** Една категория по slug (или undefined). */
export async function getCatalogCategory(slug: string): Promise<ServiceCategory | undefined> {
  const all = await getServiceCatalog();
  return all.find((c) => c.slug === slug);
}
