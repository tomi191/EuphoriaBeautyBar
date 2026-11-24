import sharp from "sharp";

/**
 * Пресъздава снимката без метаданни (EXIF с местоположението и марката на телефона, XMP).
 * Вика се на сървъра преди всеки запис в хранилището: браузърът обикновено ги маха сам (prepareFile),
 * но резервният му път и всяка ръчна заявка пращат оригинала. Ориентацията от EXIF се прилага
 * преди махането, за да не се обърне снимката. Форматът остава същият (JPG, PNG или WebP).
 * Връща null, ако файлът не се отваря като снимка: тогава нищо не се записва.
 */
export async function stripImageMetadata(buffer: Buffer): Promise<Buffer | null> {
  try {
    return await sharp(buffer, { failOn: "error" }).rotate().toBuffer();
  } catch (err) {
    console.warn("[images] не успях да махна метаданните, снимката не е записана:", err);
    return null;
  }
}

export const IMAGE_NOT_READABLE = "Тази снимка не се отваря. Избери снимка във формат JPG, PNG или WebP.";

/** Качеството на WebP за всяко качване (същото като публичната снимка в галерията, watermark.ts). */
export const WEBP_QUALITY = 86;

/**
 * Същото като stripImageMetadata, но записва WebP (решение 35: всички снимки на сайта в WebP).
 * Размерът остава; прозрачността се пази. Връща null, ако файлът не се отваря като снимка.
 */
export async function stripToWebp(buffer: Buffer): Promise<Buffer | null> {
  try {
    return await sharp(buffer, { failOn: "error" }).rotate().webp({ quality: WEBP_QUALITY }).toBuffer();
  } catch (err) {
    console.warn("[images] не успях да направя WebP, снимката не е записана:", err);
    return null;
  }
}
