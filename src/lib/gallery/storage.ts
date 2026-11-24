import { createClient } from "@supabase/supabase-js";

/** Публичните снимки на сайта (със знак). */
export const GALLERY_BUCKET = "gallery";
/** Оригиналите от специалистите, без знак: частно хранилище, отваря се само с подписан адрес. */
export const ORIGINALS_BUCKET = "gallery-originals";

export function galleryStorage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url, client: createClient(url, key) };
}

export type GalleryStorage = NonNullable<ReturnType<typeof galleryStorage>>;

export function publicGalleryUrl(s: GalleryStorage, path: string) {
  return `${s.url}/storage/v1/object/public/${GALLERY_BUCKET}/${path}`;
}

/** Пътят в публичното хранилище от адреса в src (null, ако не е файл от хранилището, а от /public). */
export function publicGalleryPath(s: GalleryStorage, src: string): string | null {
  const prefix = `${s.url}/storage/v1/object/public/${GALLERY_BUCKET}/`;
  return src.startsWith(prefix) ? src.slice(prefix.length) || null : null;
}

/**
 * Частното хранилище за оригиналите. Създава го частно; ако вече съществува като публично
 * (някой го е сменил на ръка), го прави частно, преди да се запише каквото и да е.
 * Връща false, ако не може да го гарантира: тогава нищо не се качва.
 */
export async function ensureOriginalsBucket(s: GalleryStorage): Promise<boolean> {
  const got = await s.client.storage.getBucket(ORIGINALS_BUCKET);
  if (got.error || !got.data) {
    const made = await s.client.storage.createBucket(ORIGINALS_BUCKET, { public: false });
    if (made.error) {
      // Може да е създадено междувременно от друга заявка: проверяваме пак.
      const again = await s.client.storage.getBucket(ORIGINALS_BUCKET);
      if (again.error || !again.data) {
        console.error("[gallery] не успях да създам частното хранилище:", made.error);
        return false;
      }
      return again.data.public ? makePrivate(s) : true;
    }
    return true;
  }
  return got.data.public ? makePrivate(s) : true;
}

async function makePrivate(s: GalleryStorage): Promise<boolean> {
  console.warn(`[gallery] хранилището ${ORIGINALS_BUCKET} беше публично, правя го частно`);
  const { error } = await s.client.storage.updateBucket(ORIGINALS_BUCKET, { public: false });
  if (error) {
    console.error("[gallery] не успях да направя хранилището частно:", error);
    return false;
  }
  return true;
}

/** Подписани адреси за оригиналите (за «Моите снимки» и прегледа при Снежана), за 1 час. */
export async function signOriginals(s: GalleryStorage, paths: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (paths.length === 0) return out;
  const { data, error } = await s.client.storage.from(ORIGINALS_BUCKET).createSignedUrls(paths, 3600);
  if (error) {
    console.error("[gallery] не успях да подпиша адресите на оригиналите:", error);
    return out;
  }
  for (const row of data ?? []) if (row.path && row.signedUrl) out.set(row.path, row.signedUrl);
  return out;
}
