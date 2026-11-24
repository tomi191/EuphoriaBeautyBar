/**
 * Правилата за снимката на изпълнител от администрацията. Без sharp и без база: чете ги и формата в браузъра.
 */
export const TEAM_PHOTO_MAX_BYTES = 5 * 1024 * 1024;

export const TEAM_PHOTO_ERRORS = {
  none: "Няма избран файл.",
  tooBig: "Снимката е над 5 MB.",
  heic: "Тази снимка е HEIC и браузърът не я отваря. Запази я като JPG и опитай пак.",
  type: "Позволени са само JPG, PNG и WebP изображения.",
  // Същото като IMAGE_NOT_READABLE в strip-metadata.ts (той внася sharp и не стига до браузъра).
  notReadable: "Тази снимка не се отваря. Избери снимка във формат JPG, PNG или WebP.",
} as const;

/** HEIC/HEIF: «ftyp» на 4-ти байт и марка heic, heix, mif1 и т.н. */
export function looksLikeHeic(buf: Uint8Array): boolean {
  if (buf.length < 12) return false;
  const ascii = (from: number, to: number) => String.fromCharCode(...buf.subarray(from, to));
  return ascii(4, 8) === "ftyp" && /^(heic|heix|hevc|hevx|heim|heis|mif1|msf1)$/.test(ascii(8, 12));
}
