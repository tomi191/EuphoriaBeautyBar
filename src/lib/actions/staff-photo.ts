"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireStaff } from "@/lib/actions/auth-guard";

const BUCKET = "team";
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Качва профилна снимка на изпълнителя в Supabase Storage и записва публичния URL
 * в resources.image. Замества стария текстов път (изпълнителят реално качва файл).
 * Bucket-ът се създава idempotent при първо качване (service role).
 */
export async function uploadStaffPhoto(formData: FormData) {
  const { resource } = await requireStaff();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false as const, error: "Няма избран файл." };
  if (!file.type.startsWith("image/")) return { ok: false as const, error: "Файлът трябва да е изображение." };
  if (file.size > MAX_BYTES) return { ok: false as const, error: "Снимката е над 5 MB." };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return { ok: false as const, error: "Качването не е конфигурирано (липсват Supabase ключове)." };
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  await supabase.storage.createBucket(BUCKET, { public: true }).catch(() => {}); // idempotent

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  // Нов път всеки път → не се сблъсква с CDN кеша на стария файл.
  const path = `${resource.id}-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, { contentType: file.type, upsert: true });
  if (error) return { ok: false as const, error: "Грешка при качване. Опитай пак." };

  const url = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${path}`;
  await db.update(schema.resources).set({ image: url }).where(eq(schema.resources.id, resource.id));
  revalidatePath("/staff/profile");
  revalidatePath("/zapazi-chas");
  return { ok: true as const, url };
}
