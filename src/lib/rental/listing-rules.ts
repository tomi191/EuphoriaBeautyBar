/**
 * Чистите правила на обявата за място под наем (без база): състояния и преходи, заглавие по
 * категорията, уникален адрес, вида на снимката по първите байтове. Ползват ги действията
 * (lib/actions/rental-listings.ts) и четенията (lib/data/rental-listings.ts).
 */
import { generateSlug } from "@/lib/blog-writer/slug";
import { KIND_BY_SLUG } from "@/lib/booking/kind";

export const LISTING_STATUSES = ["draft", "published", "filled", "paused"] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

/** Стар ред отпреди обявите (status NULL): active → публикувана, иначе спряна. */
export function effectiveStatus(row: { status: ListingStatus | null; active: boolean }): ListingStatus {
  return row.status ?? (row.active ? "published" : "paused");
}

/**
 * publish: първото пускане на чернова. pause: «спри». fill: «заето от <специалист>».
 * reopen: «отвори отново» на заета или спряна. release: системно, при край на сътрудничеството
 * заетото място става спряно (не се пуска пред хора само).
 */
export type ListingAction = "publish" | "pause" | "fill" | "reopen" | "release";

const TRANSITIONS: Record<ListingAction, { from: readonly ListingStatus[]; to: ListingStatus }> = {
  publish: { from: ["draft"], to: "published" },
  pause: { from: ["published"], to: "paused" },
  fill: { from: ["published", "paused"], to: "filled" },
  reopen: { from: ["filled", "paused"], to: "published" },
  release: { from: ["filled"], to: "paused" },
};

/** Новото състояние или null, ако действието не важи за сегашното. */
export function nextStatus(current: ListingStatus, action: ListingAction): ListingStatus | null {
  const t = TRANSITIONS[action];
  return t.from.includes(current) ? t.to : null;
}

const POSITION_BY_KIND: Record<string, string> = {
  hair: "фризьор",
  nails: "маникюрист",
  cosmetics: "козметик",
};

/** Позицията по категорията на услугите (през типа изпълнител); непозната категория → «специалист». */
export function positionForCategory(categorySlug: string): string {
  return POSITION_BY_KIND[KIND_BY_SLUG[categorySlug] ?? ""] ?? "специалист";
}

/** Заглавието се смята, не се пише на ръка: «Място под наем за маникюрист». */
export function listingTitle(categorySlug: string): string {
  return `Място под наем за ${positionForCategory(categorySlug)}`;
}

/** Адрес от латиница; при зает добавя -2, -3 … до първия свободен. */
export function uniqueSlug(title: string, taken: Iterable<string>): string {
  const base = generateSlug(title, 80) || "myasto";
  const used = new Set(taken);
  if (!used.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`;
    if (!used.has(candidate)) return candidate;
  }
}

export type ListingImageType = "image/jpeg" | "image/png" | "image/webp";

/** Видът на снимката по първите байтове (не по името и не по заявения тип). Друго → null. */
export function sniffImageType(bytes: Uint8Array): ListingImageType | null {
  const b = bytes;
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (
    b.length >= 8 &&
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
    b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    b.length >= 12 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && // RIFF
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50 // WEBP
  ) {
    return "image/webp";
  }
  return null;
}
