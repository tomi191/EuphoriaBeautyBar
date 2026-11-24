"use server";

import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { after } from "next/server";
import sharp from "sharp";
import { db, schema } from "@/lib/db";
import { requireStaff } from "@/lib/actions/auth-guard";
import { stripToWebp } from "@/lib/images/strip-metadata";
import { sofiaDateStr, sofiaWallToUtc } from "@/lib/booking/time";
import {
  STAFF_NOTE_MAX,
  STAFF_PHOTO_DAILY_LIMIT,
  STAFF_PHOTO_MAX_BYTES,
  STAFF_PHOTO_MIN_SHORT_SIDE,
  STAFF_UPLOAD_ERRORS as E,
  galleryCategoryForService,
  sniffImageType,
} from "@/lib/gallery/upload-rules";
import { ORIGINALS_BUCKET, ensureOriginalsBucket, galleryStorage, signOriginals } from "@/lib/gallery/storage";
import { notifyAdminNewPhoto } from "@/lib/gallery/review";

type Fail = { ok: false; error: string };
const fail = (error: string): Fail => ({ ok: false, error });

/**
 * Снимка от работата, качена от специалиста в приложението (№8 В1а).
 * Изпълнителят е само този от сесията (никога от формата). Полета във FormData:
 *   file (снимката), serviceItemId (своя услуга), noFace ("1" = «На снимката не се вижда лице»),
 *   note (думите за описанието, до 60 знака, по желание), bookingId (своя час, по желание).
 * Записва се като «чака» в частното хранилище: не излиза никъде публично до одобрението.
 */
export async function uploadStaffGalleryImage(formData: FormData) {
  const { resource } = await requireStaff();

  if (formData.get("noFace") !== "1") return fail(E.noFace);

  const note = String(formData.get("note") ?? "").replace(/\s+/g, " ").trim();
  if ([...note].length > STAFF_NOTE_MAX) return fail(E.noteTooLong);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return fail(E.notImage);
  if (file.size > STAFF_PHOTO_MAX_BYTES) return fail(E.tooBig);

  // Услугата трябва да е от неговите (отметнатите в «Моите услуги»).
  const serviceItemId = String(formData.get("serviceItemId") ?? "");
  const [svc] = serviceItemId
    ? await db
        .select({
          id: schema.serviceItems.id,
          name: schema.serviceItems.name,
          groupTitle: schema.serviceItems.groupTitle,
          categorySlug: schema.serviceCategories.slug,
        })
        .from(schema.resourceServices)
        .innerJoin(schema.serviceItems, eq(schema.serviceItems.id, schema.resourceServices.serviceItemId))
        .leftJoin(schema.serviceCategories, eq(schema.serviceCategories.id, schema.serviceItems.categoryId))
        .where(
          and(
            eq(schema.resourceServices.resourceId, resource.id),
            eq(schema.resourceServices.serviceItemId, serviceItemId),
            eq(schema.resourceServices.active, true),
          ),
        )
        .limit(1)
    : [];
  if (!svc) return fail(E.service);

  const bookingIdRaw = String(formData.get("bookingId") ?? "").trim();
  let bookingId: string | null = null;
  if (bookingIdRaw) {
    const booking = await db.query.bookings.findFirst({
      where: (b, { eq: e }) => e(b.id, bookingIdRaw),
      columns: { id: true, resourceId: true },
    });
    if (!booking || booking.resourceId !== resource.id) return fail(E.booking);
    bookingId = booking.id;
  }

  // Дневният таван (денят е по часа в София).
  const dayStart = sofiaWallToUtc(sofiaDateStr(new Date()), "00:00");
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.galleryImages)
    .where(and(eq(schema.galleryImages.uploadedBy, resource.id), gte(schema.galleryImages.createdAt, dayStart)));
  if (n >= STAFF_PHOTO_DAILY_LIMIT) return fail(E.dailyLimit(STAFF_PHOTO_DAILY_LIMIT));

  // Видът по съдържанието, после пресъздаване без метаданни (местоположение, марка на телефона).
  const raw = Buffer.from(await file.arrayBuffer());
  const kind = sniffImageType(raw);
  if (!kind) return fail(E.notImage);
  const clean = await stripToWebp(raw);
  if (!clean) return fail(E.notImage);
  const meta = await sharp(clean).metadata().catch(() => null);
  if (!meta?.width || !meta?.height) return fail(E.notImage);
  if (Math.min(meta.width, meta.height) < STAFF_PHOTO_MIN_SHORT_SIDE) return fail(E.tooSmall);

  const storage = galleryStorage();
  if (!storage) {
    console.error("[staff-gallery] липсват ключовете за хранилището");
    return fail(E.storage);
  }
  if (!(await ensureOriginalsBucket(storage))) return fail(E.storage);

  const id = `gs-${nanoid(10)}`;
  const originalPath = `${resource.id}/${id}.webp`;
  const up = await storage.client.storage.from(ORIGINALS_BUCKET).upload(originalPath, clean, { contentType: "image/webp" });
  if (up.error) {
    console.error("[staff-gallery] качването в частното хранилище падна:", up.error);
    return fail(E.storage);
  }

  const now = new Date();
  try {
    await db.insert(schema.galleryImages).values({
      id,
      src: "", // публичен файл има само след одобрението
      alt: "",
      category: galleryCategoryForService(svc),
      width: meta.width,
      height: meta.height,
      sortOrder: 0,
      resourceId: resource.id,
      uploadedBy: resource.id,
      status: "pending",
      noFaceConfirmedAt: now,
      staffNote: note || null,
      serviceItemId: svc.id,
      bookingId,
      originalPath,
      createdAt: now,
    });
  } catch (err) {
    console.error("[staff-gallery] записът в базата падна, махам файла:", err);
    await storage.client.storage.from(ORIGINALS_BUCKET).remove([originalPath]);
    return fail(E.storage);
  }

  // Снежана получава снимката в Telegram след отговора към специалиста (бавен Telegram не го задържа).
  // Камбанката в администрацията показва чакащата и без Telegram.
  after(() => notifyAdminNewPhoto(id));
  return { ok: true as const, id };
}

export type MyGalleryImage = {
  id: string;
  status: "pending" | "approved" | "rejected";
  rejectReason: string | null;
  serviceName: string | null;
  note: string | null;
  alt: string;
  createdAt: Date | null;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  /** Одобрена: публичният файл със знак. Чакаща или върната: подписан адрес към оригинала за 1 час. */
  previewUrl: string | null;
};

/** «Моите снимки»: само снимките, качени от този специалист, най-новите първи. */
export async function listMyGalleryImages(): Promise<MyGalleryImage[]> {
  const { resource } = await requireStaff();
  const rows = await db
    .select({
      id: schema.galleryImages.id,
      status: schema.galleryImages.status,
      rejectReason: schema.galleryImages.rejectReason,
      serviceName: schema.serviceItems.name,
      note: schema.galleryImages.staffNote,
      alt: schema.galleryImages.alt,
      src: schema.galleryImages.src,
      originalPath: schema.galleryImages.originalPath,
      createdAt: schema.galleryImages.createdAt,
      approvedAt: schema.galleryImages.approvedAt,
      rejectedAt: schema.galleryImages.rejectedAt,
    })
    .from(schema.galleryImages)
    .leftJoin(schema.serviceItems, eq(schema.serviceItems.id, schema.galleryImages.serviceItemId))
    .where(eq(schema.galleryImages.uploadedBy, resource.id))
    .orderBy(desc(schema.galleryImages.createdAt));

  const storage = galleryStorage();
  const toSign = rows.filter((r) => r.status !== "approved" && r.originalPath).map((r) => r.originalPath!);
  const signed = storage ? await signOriginals(storage, toSign) : new Map<string, string>();

  return rows.map(({ src, originalPath, ...r }) => ({
    ...r,
    previewUrl: r.status === "approved" ? src || null : (originalPath && signed.get(originalPath)) || null,
  }));
}

/** Кои от дадените часове вече имат негова снимка (бутонът в графика става «Добави още една снимка»). */
export async function listMyPhotoBookingIds(bookingIds: string[]): Promise<Set<string>> {
  const { resource } = await requireStaff();
  if (bookingIds.length === 0) return new Set();
  const rows = await db
    .select({ bookingId: schema.galleryImages.bookingId })
    .from(schema.galleryImages)
    .where(and(eq(schema.galleryImages.uploadedBy, resource.id), inArray(schema.galleryImages.bookingId, bookingIds)));
  return new Set(rows.map((r) => r.bookingId).filter((id): id is string => !!id));
}

/** Специалистът трие своя снимка, която чака или е върната (одобрената маха само Снежана). */
export async function deleteMyGalleryImage(imageId: string) {
  const { resource } = await requireStaff();
  const deleted = await db
    .delete(schema.galleryImages)
    .where(
      and(
        eq(schema.galleryImages.id, imageId),
        eq(schema.galleryImages.uploadedBy, resource.id),
        inArray(schema.galleryImages.status, ["pending", "rejected"]),
      ),
    )
    .returning({ originalPath: schema.galleryImages.originalPath });
  if (deleted.length === 0) return fail("Снимката не е намерена.");

  const path = deleted[0].originalPath;
  const storage = galleryStorage();
  if (path && storage) {
    const { error } = await storage.client.storage.from(ORIGINALS_BUCKET).remove([path]);
    if (error) console.error("[staff-gallery] не успях да изтрия оригинала:", path, error);
  }
  return { ok: true as const };
}
