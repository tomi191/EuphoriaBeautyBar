"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne, sql } from "drizzle-orm";
import sharp from "sharp";
import { db, schema } from "@/lib/db";
import { requireAdmin } from "@/lib/actions/auth-guard";
import { buildGalleryAlt, ALT_MAX } from "@/lib/gallery/alt";
import { applyWatermark } from "@/lib/gallery/watermark";
import { REJECT_REASON_MAX } from "@/lib/gallery/upload-rules";
import { galleryCategories } from "@/lib/data/gallery";
import {
  GALLERY_BUCKET,
  ORIGINALS_BUCKET,
  galleryStorage,
  publicGalleryPath,
  publicGalleryUrl,
} from "@/lib/gallery/storage";

type Fail = { ok: false; error: string };
const fail = (error: string): Fail => ({ ok: false, error });
const VALID_CATEGORIES = new Set(galleryCategories.filter((c) => c.value !== "all").map((c) => c.value as string));
/** Най-дългата страна на публичния файл (като при качването от администрацията). */
const PUBLIC_MAX_SIDE = 1600;

function revalidateGallery() {
  revalidatePath("/admin/gallery");
  revalidatePath("/galeriya");
  revalidatePath("/");
  revalidatePath("/zapazi-chas");
}

/**
 * Одобрява снимка от специалист (само администратор): слага знака върху копие на оригинала,
 * записва публичния файл, пази оригинала, записва описанието (alt), сменя състоянието на
 * «одобрена» и опреснява галерията. alt: поправеното от Снежана (до 125 знака); празно → сглобеното.
 * category: по желание, иначе остава смятаната от услугата.
 */
export async function approveGalleryImage(imageId: string, opts: { alt?: string | null; category?: string } = {}) {
  const session = await requireAdmin();

  const img = await db.query.galleryImages.findFirst({ where: (g, { eq: e }) => e(g.id, imageId) });
  if (!img || !img.originalPath) return fail("Снимката не е намерена.");
  if (img.status === "approved") return fail("Снимката вече е в галерията.");
  if (opts.category !== undefined && !VALID_CATEGORIES.has(opts.category)) return fail("Невалидна категория.");

  const storage = galleryStorage();
  if (!storage) return fail("Качването не е конфигурирано (липсват ключовете за хранилището).");

  const dl = await storage.client.storage.from(ORIGINALS_BUCKET).download(img.originalPath);
  if (dl.error || !dl.data) {
    console.error("[gallery-review] не успях да сваля оригинала:", img.originalPath, dl.error);
    return fail("Оригиналът не се отвори. Опитай пак след малко.");
  }
  const resized = await sharp(Buffer.from(await dl.data.arrayBuffer()))
    .rotate()
    .resize({ width: PUBLIC_MAX_SIDE, height: PUBLIC_MAX_SIDE, fit: "inside", withoutEnlargement: true })
    .toBuffer();
  const marked = await applyWatermark(resized);
  const meta = await sharp(marked.buffer).metadata();

  // Описанието: поправеното печели; иначе се сглобява от услугата, думите и датата на часа.
  let alt = (opts.alt ?? "").replace(/\s+/g, " ").trim();
  if ([...alt].length > ALT_MAX) return fail(`Описанието е до ${ALT_MAX} знака.`);
  if (!alt) {
    const [svc, booking, taken] = await Promise.all([
      img.serviceItemId
        ? db.query.serviceItems.findFirst({ where: (s, { eq: e }) => e(s.id, img.serviceItemId!), columns: { name: true } })
        : null,
      img.bookingId
        ? db.query.bookings.findFirst({ where: (b, { eq: e }) => e(b.id, img.bookingId!), columns: { startAt: true } })
        : null,
      db
        .select({ alt: schema.galleryImages.alt })
        .from(schema.galleryImages)
        .where(eq(schema.galleryImages.status, "approved")),
    ]);
    const category = opts.category ?? img.category;
    const serviceName = svc?.name ?? galleryCategories.find((c) => c.value === category)?.label ?? "Работа от салона";
    alt = buildGalleryAlt({
      serviceName,
      note: img.staffNote,
      date: booking?.startAt ?? img.createdAt ?? new Date(),
      existingAlts: taken.map((t) => t.alt),
    });
  }

  // Нов адрес при всяко одобрение: върната и пак одобрена снимка не идва от стария кеш.
  const path = `${img.id}-${Date.now().toString(36)}.webp`;
  const up = await storage.client.storage
    .from(GALLERY_BUCKET)
    .upload(path, marked.buffer, { contentType: "image/webp", upsert: true });
  if (up.error) {
    console.error("[gallery-review] не успях да запиша публичния файл:", up.error);
    return fail("Снимката не излезе. Опитай пак след малко.");
  }

  const [{ min }] = await db
    .select({ min: sql<number | null>`min(${schema.galleryImages.sortOrder})` })
    .from(schema.galleryImages)
    .where(eq(schema.galleryImages.status, "approved"));
  const updated = await db
    .update(schema.galleryImages)
    .set({
      status: "approved",
      src: publicGalleryUrl(storage, path),
      alt,
      ...(opts.category ? { category: opts.category } : {}),
      width: meta.width ?? img.width,
      height: meta.height ?? img.height,
      sortOrder: (min ?? 0) - 1,
      approvedBy: session.user.id,
      approvedAt: new Date(),
      rejectReason: null,
      rejectedAt: null,
    })
    .where(and(eq(schema.galleryImages.id, img.id), ne(schema.galleryImages.status, "approved")))
    .returning({ id: schema.galleryImages.id });
  if (updated.length === 0) return fail("Снимката вече е в галерията.");

  revalidateGallery();
  return { ok: true as const, alt, src: publicGalleryUrl(storage, path) };
}

function cleanReason(reason: string) {
  const r = reason.replace(/\s+/g, " ").trim();
  if (!r) return { error: "Напиши причина или избери готова." };
  if ([...r].length > REJECT_REASON_MAX) return { error: `Причината е до ${REJECT_REASON_MAX} знака.` };
  return { reason: r };
}

/** Връща чакаща снимка на специалиста с причина (до 80 знака). Остава само при него, оригиналът се пази. */
export async function rejectGalleryImage(imageId: string, reason: string) {
  await requireAdmin();
  const r = cleanReason(reason);
  if (!r.reason) return fail(r.error!);
  const updated = await db
    .update(schema.galleryImages)
    .set({ status: "rejected", rejectReason: r.reason, rejectedAt: new Date() })
    .where(and(eq(schema.galleryImages.id, imageId), eq(schema.galleryImages.status, "pending")))
    .returning({ id: schema.galleryImages.id });
  if (updated.length === 0) return fail("Снимката не чака одобрение.");
  revalidatePath("/admin/gallery");
  return { ok: true as const };
}

/**
 * Маха одобрена снимка от специалист от сайта: публичният файл със знака се трие, снимката става
 * «върната» с причината (специалистът я вижда), оригиналът остава. Старите снимки (без оригинал)
 * се махат с «Изтрий» (deleteGalleryImage), защото тях няма откъде да ги върнем.
 */
export async function removeGalleryImageFromSite(imageId: string, reason?: string) {
  await requireAdmin();
  const r = cleanReason(reason?.trim() ? reason : "Махната от сайта.");
  if (!r.reason) return fail(r.error!);

  const img = await db.query.galleryImages.findFirst({ where: (g, { eq: e }) => e(g.id, imageId) });
  if (!img || img.status !== "approved") return fail("Снимката не е в галерията.");
  if (!img.originalPath) return fail("Старата снимка се маха с «Изтрий».");

  const updated = await db
    .update(schema.galleryImages)
    .set({ status: "rejected", src: "", rejectReason: r.reason, rejectedAt: new Date() })
    .where(and(eq(schema.galleryImages.id, img.id), eq(schema.galleryImages.status, "approved")))
    .returning({ id: schema.galleryImages.id });
  if (updated.length === 0) return fail("Снимката не е в галерията.");

  const storage = galleryStorage();
  const path = storage ? publicGalleryPath(storage, img.src) : null;
  if (storage && path) {
    const { error } = await storage.client.storage.from(GALLERY_BUCKET).remove([path]);
    if (error) console.error("[gallery-review] не успях да изтрия публичния файл:", path, error);
  }
  revalidateGallery();
  return { ok: true as const };
}
