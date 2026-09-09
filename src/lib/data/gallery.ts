export type GalleryCategory = "all" | "boyadisvane" | "podstrigvane" | "pricheski" | "svatbeni" | "manikyur" | "grim";

export interface GalleryImage {
  id: string;
  src: string;
  alt: string;
  category: Exclude<GalleryCategory, "all">;
  width: number;
  height: number;
}

const availableIds = [1, 3, 4, 7, 8, 10, 11, 14, 15, 17, 18, 19, 20, 21, 22, 23, 24, 27, 28, 29, 30, 31, 32, 33, 34, 35];

const categoryRotation: Exclude<GalleryCategory, "all">[] = [
  "boyadisvane",
  "podstrigvane",
  "pricheski",
  "svatbeni",
  "manikyur",
];

const dimensionPool: Array<[number, number]> = [
  [800, 1000],
  [800, 1200],
  [800, 800],
  [800, 1100],
  [800, 900],
  [800, 1050],
];

export const galleryImages: GalleryImage[] = availableIds.map((id, i) => {
  const [w, h] = dimensionPool[i % dimensionPool.length];
  return {
    id: `g-${id}`,
    src: `/images/gallery/g-${id}.webp`,
    alt: `Euphoria Hair & Beauty Bar — снимка ${id}`,
    category: categoryRotation[i % categoryRotation.length],
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
