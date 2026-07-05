"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireStaff } from "@/lib/actions/auth-guard";

const BUCKET = "team";
const MAX_BYTES = 5 * 1024 * 1024;
// Само растерни формати. Никакъв SVG — сервиран от Supabase origin като image/svg+xml
// е активен документ (вграден <script>) → stored XSS. Allowlist, не startsWith("image/").
const ALLOWED_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/**
 * Качва профилна снимка на изпълнителя в Supabase Storage и записва публичния URL
 * в resources.image. Замества стария текстов път (изпълнителят реално качва файл).
 * Bucket-ът се създава idempotent при първо качване (service role).
 */
export async function uploadStaffPhoto(formData: FormData) {
  const { resource } = await requireStaff();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false as const, error: "Няма избран файл." };
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) return { ok: false as const, error: "Позволени са само JPG, PNG и WebP изображения." };
  if (file.size > MAX_BYTES) return { ok: false as const, error: "Снимката е над 5 MB." };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return { ok: false as const, error: "Качването не е конфигурирано (липсват Supabase ключове)." };
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  await supabase.storage.createBucket(BUCKET, { public: true }).catch(() => {}); // idempotent

  // Нов път всеки път → не се сблъсква с CDN кеша на стария файл.
  const path = `${resource.id}-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, { contentType: file.type, upsert: true });
  if (error) return { ok: false as const, error: "Грешка при качване. Опитай пак." };

  const url = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${path}`;
  // Изтрий стария файл (иначе storage расте неограничено при всяко ново качване).
  const oldImage = resource.image;
  const prefix = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/`;
  if (oldImage?.startsWith(prefix)) {
    const oldPath = oldImage.slice(prefix.length);
    if (oldPath && oldPath !== path) await supabase.storage.from(BUCKET).remove([oldPath]).catch(() => {});
  }

  await db.update(schema.resources).set({ image: url }).where(eq(schema.resources.id, resource.id));
  revalidatePath("/staff/profile");
  revalidatePath("/zapazi-chas");
  return { ok: true as const, url };
}
