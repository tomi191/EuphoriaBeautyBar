/**
 * Правилата за снимка от приложението за екипа (№8 В1а). Чисти функции, без база и мрежа.
 * Текстовете на грешките са на Саиф (доклад 2026-11-22-content-снимки-от-приложението, част 1.4).
 */

export const STAFF_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
/** Снимка с по-къса страна от това се отказва (и не би получила воден знак). */
export const STAFF_PHOTO_MIN_SHORT_SIDE = 480;
export const STAFF_PHOTO_DAILY_LIMIT = 10;
export const STAFF_NOTE_MAX = 60;
export const REJECT_REASON_MAX = 80;

export const STAFF_UPLOAD_ERRORS = {
  notImage: "Този файл не е снимка. Избери снимка от телефона.",
  tooBig: "Снимката е над 5 МБ. Избери друга или по-малък размер.",
  tooSmall: "Снимката е твърде малка. Снимай я пак с камерата на телефона.",
  dailyLimit: (n: number) => `Днес качи ${n} снимки: това е лимитът за ден. Утре можеш да качиш още.`,
  noFace: "Потвърди, че на снимката не се вижда лице.",
  noteTooLong: `Думите за снимката са до ${STAFF_NOTE_MAX} знака.`,
  service: "Избери услуга от своите.",
  booking: "Този час не е твой.",
  storage: "Снимката не е изпратена. Опитай пак след малко.",
} as const;

export type SniffedImage = { mime: "image/jpeg" | "image/png" | "image/webp"; ext: "jpg" | "png" | "webp" };

/** Видът на файла по първите байтове (не по думата на браузъра). Само JPG, PNG и WebP. */
export function sniffImageType(buf: Uint8Array): SniffedImage | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (buf.length >= 8 && png.every((b, i) => buf[i] === b)) return { mime: "image/png", ext: "png" };
  const ascii = (from: number, to: number) => String.fromCharCode(...buf.subarray(from, to));
  if (buf.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return { mime: "image/webp", ext: "webp" };
  return null;
}

/** Категорията в галерията (филтрите на /galeriya) по услугата. Снежана може да я смени при одобрението. */
export function galleryCategoryForService(svc: { name: string; groupTitle?: string | null; categorySlug?: string | null }): string {
  const text = `${svc.name} ${svc.groupTitle ?? ""}`.toLowerCase();
  if (svc.categorySlug === "manikyur-i-pedikyur" || /маникюр|педикюр|нокт|гел лак/.test(text)) return "manikyur";
  if (/грим/.test(text)) return "grim";
  if (/сватб|булчин/.test(text)) return "svatbeni";
  if (/приче|кок|плитк|вълни|стилизир|сешоар/.test(text)) return "pricheski";
  if (/подстриг|бретон|оформяне/.test(text)) return "podstrigvane";
  if (/боядис|балая|балеаж|кичур|омбре|тонир|цвят|изсветл|рус/.test(text)) return "boyadisvane";
  if (svc.categorySlug === "kozmetika") return "grim";
  return "pricheski";
}
