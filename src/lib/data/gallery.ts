export type GalleryCategory = "all" | "boyadisvane" | "podstrigvane" | "pricheski" | "svatbeni" | "manikyur" | "grim";

export interface GalleryImage {
  id: string;
  src: string;
  alt: string;
  category: Exclude<GalleryCategory, "all">;
  width: number;
  height: number;
}

// Категорията на всяка стара снимка е тази от базата (24.11.2026), не въртене по ред: на сайта тя
// идва от gallery_images, този списък пълни само празна база (scripts/seed.ts).
const seedCategories: Array<[number, Exclude<GalleryCategory, "all">]> = [
  [1, "boyadisvane"], [3, "manikyur"], [4, "manikyur"], [7, "svatbeni"], [8, "boyadisvane"],
  [10, "boyadisvane"], [11, "manikyur"], [14, "manikyur"], [15, "boyadisvane"], [17, "boyadisvane"],
  [18, "boyadisvane"], [19, "boyadisvane"], [20, "pricheski"], [21, "manikyur"], [22, "podstrigvane"],
  [23, "boyadisvane"], [24, "podstrigvane"], [27, "pricheski"], [28, "svatbeni"], [29, "pricheski"],
  [30, "boyadisvane"], [31, "manikyur"], [32, "pricheski"], [33, "svatbeni"], [34, "svatbeni"],
  [35, "boyadisvane"],
];

const dimensionPool: Array<[number, number]> = [
  [800, 1000],
  [800, 1200],
  [800, 800],
  [800, 1100],
  [800, 900],
  [800, 1050],
];

export const galleryImages: GalleryImage[] = seedCategories.map(([id, category], i) => {
  const [w, h] = dimensionPool[i % dimensionPool.length];
  return {
    id: `g-${id}`,
    src: `/images/gallery/g-${id}.webp`,
    alt: `Euphoria Hair & Beauty Bar — снимка ${id}`,
    category,
    width: w,
    height: h,
  };
});

export const galleryCategories: Array<{ value: GalleryCategory; label: string }> = [
  { value: "all", label: "Всички" },
  { value: "boyadisvane", label: "Боядисване" },
  { value: "podstrigvane", label: "Подстригване" },
  { value: "pricheski", label: "Прически" },
  { value: "svatbeni", label: "Сватбени" },
  { value: "manikyur", label: "Маникюр" },
  // От 09.2026 салонът има гримьорски кът (Evagarden) → отделен филтър, не се крие под „Прически“.
  { value: "grim", label: "Грим" },
];

/** Какво се вижда на снимка от дадена категория — в един израз, за alt текста. */
const CATEGORY_ALT: Record<string, string> = {
  boyadisvane: "Боядисана коса",
  podstrigvane: "Подстригване",
  pricheski: "Прическа",
  svatbeni: "Сватбена прическа",
  manikyur: "Маникюр",
  grim: "Грим",
};

/**
 * Alt текст за снимка от галерията. Описанието на човека печели; ако липсва,
 * пада на КАТЕГОРИЯТА (реален избор при качването), а не на един и същ низ за
 * всички снимки. Одит №7: 20 снимки делят дословно еднакъв alt = нула стойност
 * за екранен четец и за Google Images.
 */
export function galleryAlt(category: string, description?: string | null): string {
  const d = description?.trim();
  if (d) return d;
  const what = CATEGORY_ALT[category];
  return what
    ? `${what} — реална работа от салон Euphoria, кв. Левски, Варна`
    : "Реална работа от салон Euphoria, кв. Левски, Варна";
}
