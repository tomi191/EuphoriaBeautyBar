export type GalleryCategory = "all" | "boyadisvane" | "podstrigvane" | "pricheski" | "svatbeni" | "manikyur";

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
];
