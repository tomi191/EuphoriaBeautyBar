"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { and, eq, isNull, like } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { requireAdmin } from "@/lib/actions/auth-guard";
import { RENTAL_BENEFIT_KEYS } from "@/lib/rental/benefits";
import {
  effectiveStatus,
  listingTitle,
  nextStatus,
  sniffImageType,
  uniqueSlug,
  type ListingAction,
} from "@/lib/rental/listing-rules";

/*
 * Обявата за място под наем: само администратор. Наем и цена няма като поле (думата на
 * собственика, 22.11.2026: наемът не е публичен). Facebook не се вика оттук.
 */

const rp = schema.rentalPositions;
const BUCKET = "rental";
const MAX_BYTES = 5 * 1024 * 1024;
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

type Fail = { ok: false; error: string };
const fail = (error: string): Fail => ({ ok: false, error });

function revalidateListing(slug: string | null) {
  revalidatePath("/admin/positions");
  revalidatePath("/karieri");
  if (slug) revalidatePath(`/karieri/${slug}`);
  revalidatePath("/za-nas");
  revalidatePath("/");
}

const idSchema = z.string().min(1).max(64);

const createSchema = z.object({ categoryId: idSchema });

/** Нова чернова от категория: заглавието и адресът се смятат, услугите на категорията идват отметнати. */
export async function createListingDraft(input: z.input<typeof createSchema>) {
  await requireAdmin();
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return fail("Избери категория.");
  const category = await db.query.serviceCategories.findFirst({
    where: (c, { eq }) => eq(c.id, parsed.data.categoryId),
  });
  if (!category) return fail("Категорията не е намерена.");

  const items = await db.query.serviceItems.findMany({
    where: (s, { and, eq }) => and(eq(s.categoryId, category.id), eq(s.bookableOnline, true)),
    orderBy: (s, { asc }) => [asc(s.sortOrder), asc(s.name)],
    columns: { id: true },
  });
  const title = listingTitle(category.slug);
  const id = nanoid();
  const now = new Date();

  // Адресът е уникален и в базата (индекс); при сблъсък от едновременно създаване: още един опит.
  for (let attempt = 0; attempt < 2; attempt++) {
    const base = uniqueSlug(title, []);
    const taken = await db.select({ slug: rp.slug }).from(rp).where(like(rp.slug, `${base}%`));
    const slug = uniqueSlug(title, taken.flatMap((t) => (t.slug ? [t.slug] : [])));
    try {
      await db.insert(rp).values({
        id,
        title,
        type: "Под наем · по график",
        description: "",
        skills: [],
        active: false, // старите четци показват само активните: черновата не излиза
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
        categoryId: category.id,
        serviceIds: items.map((i) => i.id),
        slug,
        benefits: [],
        status: "draft",
      });
      revalidatePath("/admin/positions");
      return { ok: true as const, id, slug, title };
    } catch (e) {
      if ((e as { code?: string })?.code !== "23505" || attempt === 1) throw e;
    }
  }
  return fail("Не успях да запазя обявата. Опитай пак.");
}

const updateSchema = z.object({
  serviceIds: z.array(idSchema).max(200).optional(),
  benefits: z.array(z.enum(RENTAL_BENEFIT_KEYS)).max(RENTAL_BENEFIT_KEYS.length).optional(),
  /** Само махане (null). Нова снимка идва през uploadListingImage. */
  image: z.null().optional(),
  adminNote: z.string().max(2000).nullable().optional(),
});

/** Обновява услугите, предимствата, бележката за администратора; image: null маха снимката. */
export async function updateListing(id: string, input: z.input<typeof updateSchema>) {
  await requireAdmin();
  if (!idSchema.safeParse(id).success) return fail("Обявата не е намерена.");
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return fail("Невалидни данни.");
  const d = parsed.data;
  const row = await db.query.rentalPositions.findFirst({ where: (p, { eq }) => eq(p.id, id) });
  if (!row) return fail("Обявата не е намерена.");

  const set: Partial<typeof rp.$inferInsert> = { updatedAt: new Date() };
  if (d.serviceIds) {
    const wanted = [...new Set(d.serviceIds)];
    if (wanted.length > 0) {
      if (!row.categoryId) return fail("Обявата няма категория.");
      const own = await db.query.serviceItems.findMany({
        where: (s, { eq }) => eq(s.categoryId, row.categoryId!),
        columns: { id: true },
      });
      const ownIds = new Set(own.map((s) => s.id));
      if (wanted.some((sid) => !ownIds.has(sid))) return fail("Услугата не е от категорията на обявата.");
    }
    set.serviceIds = wanted;
  }
  if (d.benefits) set.benefits = [...new Set(d.benefits)];
  if (d.adminNote !== undefined) set.adminNote = d.adminNote?.trim() ? d.adminNote.trim() : null;
  if (d.image === null) set.image = null;

  await db.update(rp).set(set).where(eq(rp.id, id));
  if (d.image === null && row.image) await removeStoredImage(row.image);
  revalidateListing(row.slug);
  return { ok: true as const };
}

const NOT_ALLOWED: Record<ListingAction, string> = {
  publish: "Само чернова може да се публикува.",
  pause: "Само публикувана обява може да се спре.",
  fill: "Само публикувана или спряна обява може да се отбележи като заета.",
  reopen: "Само заета или спряна обява може да се отвори отново.",
  release: "Само заета обява може да се освободи.",
};

/**
 * Една смяна на състоянието. Пише само ако редът е още в състоянието, от което сме тръгнали
 * (две натискания едновременно не правят два прехода).
 */
async function transition(id: string, action: ListingAction, extra: Partial<typeof rp.$inferInsert> = {}) {
  if (!idSchema.safeParse(id).success) return fail("Обявата не е намерена.");
  const row = await db.query.rentalPositions.findFirst({ where: (p, { eq }) => eq(p.id, id) });
  if (!row) return fail("Обявата не е намерена.");
  const current = effectiveStatus(row);
  const to = nextStatus(current, action);
  if (!to) return fail(NOT_ALLOWED[action]);
  if (action === "publish" && (!row.categoryId || !row.slug)) return fail("Обявата няма категория.");

  const updated = await db
    .update(rp)
    .set({ ...extra, status: to, active: to === "published", updatedAt: new Date() })
    .where(and(eq(rp.id, id), row.status === null ? isNull(rp.status) : eq(rp.status, row.status)))
    .returning({ id: rp.id });
  if (updated.length === 0) return fail("Обявата се смени междувременно. Отвори я пак.");
  revalidateListing(row.slug);
  return { ok: true as const, status: to };
}

/** «Публикувай»: чернова → публикувана. */
export async function publishListing(id: string) {
  await requireAdmin();
  return transition(id, "publish", { publishedAt: new Date() });
}

/** «Спри»: публикувана → спряна (не се вижда). */
export async function pauseListing(id: string) {
  await requireAdmin();
  return transition(id, "pause");
}

/** «Заето от <специалист>». */
export async function markListingFilled(id: string, resourceId: string) {
  await requireAdmin();
  if (!idSchema.safeParse(resourceId).success) return fail("Избери специалист.");
  const resource = await db.query.resources.findFirst({
    where: (r, { eq }) => eq(r.id, resourceId),
    columns: { id: true },
  });
  if (!resource) return fail("Специалистът не е намерен.");
  return transition(id, "fill", { filledByResourceId: resource.id, filledAt: new Date() });
}

/** «Отвори отново»: заета или спряна → публикувана; «заета от» се чисти. */
export async function reopenListing(id: string) {
  await requireAdmin();
  return transition(id, "reopen", { filledByResourceId: null, filledAt: null, publishedAt: new Date() });
}

function storage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url, client: createClient(url, key) };
}

async function removeStoredImage(image: string) {
  const s = storage();
  if (!s) return;
  const prefix = `${s.url}/storage/v1/object/public/${BUCKET}/`;
  if (!image.startsWith(prefix)) return;
  const path = image.slice(prefix.length);
  if (path) await s.client.storage.from(BUCKET).remove([path]).catch(() => {});
}

/**
 * Снимката на обявата. Браузърът я смалява преди това (prepareFile от галерията); тук видът се
 * проверява по първите байтове, не по заявения тип.
 */
export async function uploadListingImage(id: string, formData: FormData) {
  await requireAdmin();
  if (!idSchema.safeParse(id).success) return fail("Обявата не е намерена.");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("Няма избран файл.");
  if (file.size > MAX_BYTES) return fail("Снимката е над 5 MB.");
  const buffer = Buffer.from(await file.arrayBuffer());
  const type = sniffImageType(buffer.subarray(0, 16));
  if (!type) return fail("Позволени са само JPG, PNG и WebP изображения.");

  const row = await db.query.rentalPositions.findFirst({
    where: (p, { eq }) => eq(p.id, id),
    columns: { id: true, slug: true, image: true },
  });
  if (!row) return fail("Обявата не е намерена.");

  const s = storage();
  if (!s) return fail("Качването не е настроено (липсват ключовете за хранилището).");
  await s.client.storage.createBucket(BUCKET, { public: true }).catch(() => {}); // idempotent

  // Нов път всеки път: Facebook и CDN кешират картината по адрес.
  const path = `${row.id}-${Date.now()}.${EXT[type]}`;
  const { error } = await s.client.storage.from(BUCKET).upload(path, buffer, { contentType: type });
  if (error) return fail("Грешка при качване. Опитай пак.");
  const url = `${s.url}/storage/v1/object/public/${BUCKET}/${path}`;

  await db.update(rp).set({ image: url, updatedAt: new Date() }).where(eq(rp.id, row.id));
  if (row.image && row.image !== url) await removeStoredImage(row.image);
  revalidateListing(row.slug);
  return { ok: true as const, url };
}
