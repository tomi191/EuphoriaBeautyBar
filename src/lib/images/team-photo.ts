import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { db } from "@/lib/db";
import { sniffImageType } from "@/lib/gallery/upload-rules";
import { stripImageMetadata } from "@/lib/images/strip-metadata";
import { looksLikeHeic, TEAM_PHOTO_ERRORS, TEAM_PHOTO_MAX_BYTES } from "@/lib/images/team-photo-rules";

export { TEAM_PHOTO_ERRORS };

/**
 * Снимката на изпълнител, качена от администрацията (визия: карта 4:5 в «За нас», 120×150).
 * Видът се проверява по първите байтове, данните за място се махат (strip-metadata), снимката
 * се смалява до 600×750 и става WebP. Хранилището е публичното «team», същото като снимката,
 * която изпълнителят качва сам от приложението (staff-photo.ts).
 */
export const TEAM_BUCKET = "team";
const MAX_W = 600;
const MAX_H = 750;

export async function processTeamPhoto(original: Buffer): Promise<{ ok: true; webp: Buffer } | { ok: false; error: string }> {
  if (original.length === 0) return { ok: false, error: TEAM_PHOTO_ERRORS.none };
  if (original.length > TEAM_PHOTO_MAX_BYTES) return { ok: false, error: TEAM_PHOTO_ERRORS.tooBig };
  const head = original.subarray(0, 16);
  if (!sniffImageType(head)) return { ok: false, error: looksLikeHeic(head) ? TEAM_PHOTO_ERRORS.heic : TEAM_PHOTO_ERRORS.type };
  // Местоположението в снимката е лични данни: нататък върви само копие без метаданни.
  const clean = await stripImageMetadata(original);
  if (!clean) return { ok: false, error: TEAM_PHOTO_ERRORS.notReadable };
  const webp = await sharp(clean).resize(MAX_W, MAX_H, { fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  return { ok: true, webp };
}

export function teamStorage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { prefix: `${url}/storage/v1/object/public/${TEAM_BUCKET}/`, client: createClient(url, key) };
}

/**
 * Трие файл от «team», ако адресът е от нашето хранилище и никой изпълнител или член на екипа вече не го ползва.
 * Стари пътища (/images/team/…) и чужди адреси не се пипат.
 */
export async function removeTeamPhotoIfUnused(image: string | null | undefined): Promise<void> {
  if (!image) return;
  const s = teamStorage();
  if (!s || !image.startsWith(s.prefix)) return;
  const path = image.slice(s.prefix.length);
  if (!path) return;
  const inUse = await db.query.resources.findFirst({ where: (r, { eq }) => eq(r.image, image), columns: { id: true } });
  if (inUse) return;
  // Същото хранилище ползва и «Екип» (/admin/team): снимка на член не се трие отвън.
  const inTeam = await db.query.teamMembers.findFirst({ where: (t, { eq }) => eq(t.image, image), columns: { id: true } });
  if (inTeam) return;
  const { error } = await s.client.storage.from(TEAM_BUCKET).remove([path]);
  if (error) console.warn("[team-photo] старата снимка не е изтрита:", path, error.message);
}
