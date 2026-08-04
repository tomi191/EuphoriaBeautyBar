"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";
import { nanoid } from "nanoid";
import { db, schema } from "@/lib/db";
import { requireAdmin } from "@/lib/actions/auth-guard";
import { galleryCategories } from "@/lib/data/gallery";

const BUCKET = "gallery";
const MAX_BYTES = 10 * 1024 * 1024;
// Само растерни формати. Никакъв SVG — сервиран от Supabase origin като image/svg+xml
// е активен документ (вграден <script>) → stored XSS. Allowlist, не startsWith("image/").
const ALLOWED_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

const VALID_CATEGORIES = new Set(galleryCategories.filter((c) => c.value !== "all").map((c) => c.value as string));

/** Пътищата, които показват галерийни снимки — инвалидират се при всяка промяна. */
function revalidateGallery() {
  revalidatePath("/admin/gallery");
  revalidatePath("/galeriya");
  revalidatePath("/");
  revalidatePath("/zapazi-chas");
}

/** Тагва (или разтагва) снимка от галерията към изпълнител — захранва портфолиото при записване. */
export async function setGalleryImageResource(imageId: string, resourceId: string | null) {
  await requireAdmin();
  await db
    .update(schema.galleryImages)
    .set({ resourceId: resourceId || null })
    .where(eq(schema.galleryImages.id, imageId));
  revalidatePath("/admin/gallery");
  revalidatePath("/zapazi-chas");
}

/**
 * Качва снимка в Supabase Storage (bucket "gallery") и я добавя в галерията на сайта.
 * Формата праща и width/height (измерени в браузъра) — нужни за masonry подредбата,
 * защото на сървъра няма image decoder без допълнителна зависимост.
 * Новата снимка застава най-отпред (sortOrder = min - 1): най-скорошната работа се вижда първа.
 */
export async function uploadGalleryImage(formData: FormData) {
  await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false as const, error: "Няма избран файл." };
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) return { ok: false as const, error: "Позволени са само JPG, PNG и WebP изображения." };
  if (file.size > MAX_BYTES) return { ok: false as const, error: "Снимката е над 10 MB." };

  const category = String(formData.get("category") ?? "");
  if (!VALID_CATEGORIES.has(category)) return { ok: false as const, error: "Невалидна категория." };

  const description = String(formData.get("description") ?? "").trim().slice(0, 500) || null;

  const width = Math.round(Number(formData.get("width")));
  const height = Math.round(Number(formData.get("height")));
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1 || width > 20000 || height > 20000) {
    return { ok: false as const, error: "Невалидни размери на изображението." };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return { ok: false as const, error: "Качването не е конфигурирано (липсват Supabase ключове)." };
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  await supabase.storage.createBucket(BUCKET, { public: true }).catch(() => {}); // idempotent

  const id = `gu-${nanoid(10)}`;
  const path = `${id}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, { contentType: file.type });
  if (error) return { ok: false as const, error: "Грешка при качване. Опитай пак." };

  const src = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${path}`;
  const [{ min }] = await db
    .select({ min: sql<number | null>`min(${schema.galleryImages.sortOrder})` })
    .from(schema.galleryImages);

  await db.insert(schema.galleryImages).values({
    id,
    src,
    alt: description ?? "Euphoria Hair & Beauty Bar — работа от салона",
    category,
    width,
    height,
    sortOrder: (min ?? 0) - 1,
    description,
  });

  revalidateGallery();
  return { ok: true as const, id };
}

/** Обновява категорията и/или описанието на снимка. Описанието захранва и alt текста. */
export async function updateGalleryImageMeta(
  imageId: string,
  meta: { category?: string; description?: string | null },
) {
  await requireAdmin();

  const patch: Partial<typeof schema.galleryImages.$inferInsert> = {};
  if (meta.category !== undefined) {
    if (!VALID_CATEGORIES.has(meta.category)) return { ok: false as const, error: "Невалидна категория." };
    patch.category = meta.category;
  }
  if (meta.description !== undefined) {
    const description = (meta.description ?? "").trim().slice(0, 500) || null;
    patch.description = description;
    patch.alt = description ?? "Euphoria Hair & Beauty Bar — работа от салона";
  }
  if (Object.keys(patch).length === 0) return { ok: true as const };

  await db.update(schema.galleryImages).set(patch).where(eq(schema.galleryImages.id, imageId));
  revalidateGallery();
  return { ok: true as const };
}

/** Изтрива снимка от галерията (и файла ѝ от Storage, ако е качен там, не seed от /public). */
export async function deleteGalleryImage(imageId: string) {
  await requireAdmin();

  const img = await db.query.galleryImages.findFirst({ where: (g, { eq: eqOp }) => eqOp(g.id, imageId) });
  if (!img) return { ok: false as const, error: "Снимката не е намерена." };

  await db.delete(schema.galleryImages).where(eq(schema.galleryImages.id, imageId));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const prefix = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/`;
  if (supabaseUrl && serviceKey && img.src.startsWith(prefix)) {
    const path = img.src.slice(prefix.length);
    if (path) {
      const supabase = createClient(supabaseUrl, serviceKey);
      await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
    }
  }

  revalidateGallery();
  return { ok: true as const };
}
