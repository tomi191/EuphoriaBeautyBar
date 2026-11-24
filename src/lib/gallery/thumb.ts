// Малкото копие на снимка от галерията за плочката (№8, визия №32). Стои до голямата със
// същото име и `-w600.webp` накрая: `/images/gallery/g-1.webp` → `/images/gallery/g-1-w600.webp`.
// Оптимизаторът на Next.js не се ползва (решение 6 чака), затова размерите се правят при
// качването, при одобрението и със scripts/gallery-thumbs.ts за старите снимки.

export const THUMB_WIDTH = 600;
export const THUMB_SUFFIX = `-w${THUMB_WIDTH}.webp`;

/** Адресът на малкото копие или null, ако снимката няма разширение, от което да се изведе. */
export function galleryThumbSrc(src: string): string | null {
  if (!/\.(webp|jpe?g|png)$/i.test(src)) return null;
  if (src.endsWith(THUMB_SUFFIX)) return src;
  return src.replace(/\.(webp|jpe?g|png)$/i, THUMB_SUFFIX);
}
