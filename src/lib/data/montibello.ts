/**
 * Montibello каталог — представяне на партньорската марка по категории.
 *
 * Euphoria работи с Montibello (испанска професионална марка, Барселона).
 * Тук показваме каталога по категории; продуктите НЕ се продават онлайн —
 * купуват се на място в салона след консултация.
 *
 * Принцип за съдържанието: само проверими факти. Имената на линиите и какво
 * представляват фактически са от официалния каталог (hair.montibello.com).
 * Подробните per-продуктови описания + собствени снимки се добавят, когато
 * салонът разполага с реален материал — не измисляме маркетингово копи.
 *
 * Акцентните цветове реферират салвия палитрата (НЕ виолет/циан) — виж globals.css.
 */

export type MontibelloAccent = "sage" | "mint" | "blush" | "ink";

const ACCENT_OKLCH: Record<MontibelloAccent, string> = {
  sage: "oklch(0.47 0.085 162)",
  mint: "oklch(0.83 0.08 168)",
  blush: "oklch(0.78 0.09 25)",
  ink: "oklch(0.30 0.02 160)",
};

export function accentColor(a: MontibelloAccent): string {
  return ACCENT_OKLCH[a];
}

export interface MontibelloCategory {
  slug: string;
  title: string;
  shortTitle: string;
  /** Фактическо описание на категорията — какво включва. */
  description: string;
}

export interface MontibelloProduct {
  slug: string;
  name: string;
  /** Подсемейство/линия (HOP Ultra, Cromatone, Oxibel…). */
  line: string;
  categorySlug: string;
  /** Фактически тип на продукта. */
  productType: "шампоан" | "маска" | "балсам" | "боя" | "оксидант" | "стайлинг" | "терапия";
  shortDescription: string;
  /** Само за продукти с реално, проверимо описание (HOP линията). */
  description?: string;
  benefits?: string[];
  forHairType?: string;
  accent: MontibelloAccent;
  /** Собствена/брандова снимка; ако липсва — рендира марковия акцент. */
  productImage?: string;
}

export const montibelloCategories: MontibelloCategory[] = [
  {
    slug: "grizha",
    title: "Грижа за косата",
    shortTitle: "Грижа",
    description:
      "Шампоани, маски и балсами за ежедневна и интензивна грижа. В салона работим основно с линията HOP Ultra на база биотехнология от водорасли.",
  },
  {
    slug: "boyadisvane",
    title: "Боядисване",
    shortTitle: "Цвят",
    description:
      "Професионалните системи за цвят на Montibello — трайни оксидативни бои, тонери и изсветляване с грижа. Прилагат се само в салона.",
  },
  {
    slug: "oksidanti",
    title: "Оксиданти",
    shortTitle: "Оксиданти",
    description:
      "Кремообразни водородни емулсии в различни обеми, които активират боята и изсветляването. Салонен материал.",
  },
  {
    slug: "stayling",
    title: "Стайлинг и финиш",
    shortTitle: "Стайлинг",
    description:
      "Продукти за оформяне и задържане на прическата — пяна, спрей, лак, текстура.",
  },
  {
    slug: "tehnichni",
    title: "Технически терапии",
    shortTitle: "Терапии",
    description:
      "Салонни процедури за изправяне, къдрене и кератиново възстановяване. Извършват се само от майстор.",
  },
];

export const montibelloProducts: MontibelloProduct[] = [
  // ── Грижа: HOP Ultra (с реални, проверими описания) ──
  {
    slug: "hop-ultra-repair",
    name: "HOP Ultra Repair",
    line: "HOP Ultra",
    categorySlug: "grizha",
    productType: "шампоан",
    shortDescription: "Интензивно възстановяване за увредена коса",
    description:
      "Шампоан за дълбоко възстановяване на химически третирана и увредена коса. Подхранва влакното и изглажда повърхността, за да върне устойчивост и блясък.",
    benefits: [
      "Възстановява увредени косъмчета",
      "Дълбоко подхранване",
      "Намалява накъсаността и сплетеността",
      "Връща естествения блясък",
    ],
    forHairType: "Увредена, химически третирана",
    accent: "sage",
    productImage: "/images/montibello/repair-shampoo.png",
  },
  {
    slug: "hop-ultra-volume",
    name: "HOP Ultra Volume",
    line: "HOP Ultra",
    categorySlug: "grizha",
    productType: "шампоан",
    shortDescription: "Лек обем без утежняване",
    description:
      "Лека формула с протеини, която изгражда обем от корена и придава плътност, без да утежнява косата. Подходяща за тънка и склонна към омазняване коса.",
    benefits: [
      "Видим обем от първа употреба",
      "Без утежняване на корените",
      "Защита срещу омазняване",
      "Дълготрайно задържане на формата",
    ],
    forHairType: "Тънка, без обем",
    accent: "mint",
    productImage: "/images/montibello/volume-shampoo.png",
  },
  {
    slug: "hop-ultra-silver",
    name: "HOP Ultra Silver",
    line: "HOP Ultra",
    categorySlug: "grizha",
    productType: "шампоан",
    shortDescription: "Неутрализира жълти оттенъци",
    description:
      "Виолетови пигменти, които неутрализират нежеланите топли оттенъци в руса, бяла или сребриста коса и запазват студения, чист цвят.",
    benefits: [
      "Премахва жълти оттенъци",
      "Подсилва студения тон",
      "Подхранване с антиоксиданти",
      "Предпазва от UV избледняване",
    ],
    forHairType: "Руса, бяла, сребриста",
    accent: "ink",
    productImage: "/images/montibello/silver-shampoo.png",
  },
  {
    slug: "hop-ultra-hydration",
    name: "HOP Ultra Hydration",
    line: "HOP Ultra",
    categorySlug: "grizha",
    productType: "шампоан",
    shortDescription: "Дълбока хидратация за суха коса",
    description:
      "Формула с хиалуронова киселина и растителни екстракти, която връща влагата на суха и обезводнена коса и я прави по-мека и податлива на оформяне.",
    benefits: [
      "Интензивна хидратация",
      "По-мека и гладка коса",
      "Намалява накъсаността",
      "Защита от термично увреждане",
    ],
    forHairType: "Суха, обезводнена",
    accent: "mint",
    productImage: "/images/montibello/hydration-shampoo.png",
  },
  {
    slug: "hop-ultra-colour",
    name: "HOP Ultra Colour",
    line: "HOP Ultra",
    categorySlug: "grizha",
    productType: "шампоан",
    shortDescription: "Удължава трайността на цвета",
    description:
      "Грижа за боядисана коса с UV филтри и антиоксиданти, която удължава трайността на цвета и пази интензивността между посещенията.",
    benefits: [
      "Удължава трайността на цвета",
      "UV защита",
      "Интензивен блясък",
      "Подхранване след боядисване",
    ],
    forHairType: "Боядисана",
    accent: "blush",
    productImage: "/images/montibello/repair-rinse.png",
  },
  {
    slug: "hop-ultra-blonde",
    name: "HOP Ultra Blonde",
    line: "HOP Ultra",
    categorySlug: "grizha",
    productType: "шампоан",
    shortDescription: "Грижа за изсветлена коса",
    description:
      "Подхранваща грижа за изрусена и изсветлена коса, която укрепва крехкото влакно и поддържа чист, светъл резултат.",
    benefits: [
      "Укрепва изсветлената коса",
      "Намалява чупливостта",
      "Поддържа чист рус тон",
      "Здравословен блясък",
    ],
    forHairType: "Изрусена, изсветлена",
    accent: "blush",
    productImage: "/images/montibello/blonde-shampoo.png",
  },

  // ── Боядисване (фактически линии; подробности и снимки се добавят от салона) ──
  {
    slug: "cromatone",
    name: "Cromatone",
    line: "Cromatone",
    categorySlug: "boyadisvane",
    productType: "боя",
    shortDescription: "Трайна оксидативна боя с богата палитра",
    forHairType: "Всякаква",
    accent: "blush",
  },
  {
    slug: "cromatone-metallics",
    name: "Cromatone Metallics",
    line: "Cromatone",
    categorySlug: "boyadisvane",
    productType: "боя",
    shortDescription: "Мултитонална боя за студени, металик финиши",
    forHairType: "Всякаква",
    accent: "ink",
  },
  {
    slug: "cromatone-recover",
    name: "Cromatone Re-cover",
    line: "Cromatone",
    categorySlug: "boyadisvane",
    productType: "боя",
    shortDescription: "100% покритие на белите коси",
    forHairType: "Със сиви/бели коси",
    accent: "sage",
  },
  {
    slug: "luxlight",
    name: "Luxlight",
    line: "Luxlight",
    categorySlug: "boyadisvane",
    productType: "боя",
    shortDescription: "Изсветляване с максимална грижа за влакното",
    forHairType: "За изсветляване",
    accent: "blush",
  },

  // ── Оксиданти ──
  {
    slug: "oxibel",
    name: "Oxibel",
    line: "Oxibel",
    categorySlug: "oksidanti",
    productType: "оксидант",
    shortDescription: "Кремообразен оксидант в обеми 10 / 20 / 30 / 40",
    forHairType: "Салонен материал",
    accent: "mint",
  },

  // ── Стайлинг ──
  {
    slug: "decode",
    name: "Decode",
    line: "Decode",
    categorySlug: "stayling",
    productType: "стайлинг",
    shortDescription: "Гама за оформяне — текстура, фиксация и финиш",
    forHairType: "Всякаква",
    accent: "ink",
  },

  // ── Технически терапии ──
  {
    slug: "organic-keratin",
    name: "Organic Keratin",
    line: "HOP",
    categorySlug: "tehnichni",
    productType: "терапия",
    shortDescription: "Кератиново изправяне и възстановяване (салонна процедура)",
    forHairType: "Накъдрена, непокорна",
    accent: "sage",
  },
];

export function getMontibelloProduct(slug: string): MontibelloProduct | undefined {
  return montibelloProducts.find((p) => p.slug === slug);
}

/** Продукти с пълно описание (HOP) получават собствена детайл страница. */
export function hasDetailPage(p: MontibelloProduct): boolean {
  return Boolean(p.description && p.benefits && p.benefits.length > 0);
}

export function productsByCategory(categorySlug: string): MontibelloProduct[] {
  return montibelloProducts.filter((p) => p.categorySlug === categorySlug);
}
