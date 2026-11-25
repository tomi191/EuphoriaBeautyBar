"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { and, eq, isNull, like } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { requireAdmin } from "@/lib/actions/auth-guard";
import { postListingToFacebookPage, type FacebookPostResult } from "@/lib/facebook/page-post";
import { IMAGE_NOT_READABLE, stripToWebp } from "@/lib/images/strip-metadata";
import { RENTAL_BENEFIT_KEYS } from "@/lib/rental/benefits";
import {
  effectiveStatus,
  fillSeat,
  listingPosition,
  listingTitle,
  MAX_SEATS,
  nextStatus,
  sniffImageType,
  uniqueSlug,
  type ListingAction,
} from "@/lib/rental/listing-rules";
import { listingFacebookPost } from "@/lib/rental/public-copy";
import { siteConfig } from "@/lib/site";

/*
 * Обявата за място под наем: само администратор. Наемът (сумата на месец) се вижда в обявата
 * само при включен ключ «показвай в обявата» (визия №18); по подразбиране ключът е изключен.
 * При първото публикуване сайтът опитва да пусне пост във Facebook (publishListing); обявата е
 * публикувана, каквото и да върне Facebook, а резултатът се казва във формата.
 */

const rp = schema.rentalPositions;
const BUCKET = "rental";
const MAX_BYTES = 5 * 1024 * 1024;

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

/** По подразбиране в нова обява са отметнати първите шест предимства (визия №12, стъпка «Предимства»). */
const DEFAULT_BENEFITS = RENTAL_BENEFIT_KEYS.slice(0, 6);

/** Онлайн услугите на категорията, в реда на ценоразписа: в нова обява идват всички отметнати. */
async function categoryServiceIds(categoryId: string) {
  const items = await db.query.serviceItems.findMany({
    where: (s, { and, eq }) => and(eq(s.categoryId, categoryId), eq(s.bookableOnline, true)),
    orderBy: (s, { asc }) => [asc(s.sortOrder), asc(s.name)],
    columns: { id: true },
  });
  return items.map((i) => i.id);
}

/** Групите на избраните услуги (за заглавието «за гримьор»). */
async function serviceGroups(ids: string[]) {
  if (ids.length === 0) return [];
  const items = await db.query.serviceItems.findMany({
    where: (s, { inArray }) => inArray(s.id, ids),
    columns: { groupTitle: true },
  });
  return items.map((i) => i.groupTitle);
}

/** Първият свободен адрес за заглавието (без адреса на самата обява). */
async function freeSlug(title: string, exceptId?: string) {
  const base = uniqueSlug(title, []);
  const taken = await db.select({ id: rp.id, slug: rp.slug }).from(rp).where(like(rp.slug, `${base}%`));
  return uniqueSlug(title, taken.flatMap((t) => (t.slug && t.id !== exceptId ? [t.slug] : [])));
}

/** Нова чернова от категория: заглавието и адресът се смятат, услугите на категорията идват отметнати. */
export async function createListingDraft(input: z.input<typeof createSchema>) {
  await requireAdmin();
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return fail("Избери категория.");
  const category = await db.query.serviceCategories.findFirst({
    where: (c, { eq }) => eq(c.id, parsed.data.categoryId),
  });
  if (!category) return fail("Категорията не е намерена.");

  const serviceIds = await categoryServiceIds(category.id);
  const title = listingTitle(category.slug);
  const id = nanoid();
  const now = new Date();

  // Адресът е уникален и в базата (индекс); при сблъсък от едновременно създаване: още един опит.
  for (let attempt = 0; attempt < 2; attempt++) {
    const slug = await freeSlug(title);
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
        serviceIds,
        slug,
        benefits: [...DEFAULT_BENEFITS],
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
  /** Друго място (стъпка «Място»): заглавието се смята наново, услугите стават всички от категорията. */
  categoryId: idSchema.optional(),
  serviceIds: z.array(idSchema).max(200).optional(),
  benefits: z.array(z.enum(RENTAL_BENEFIT_KEYS)).max(RENTAL_BENEFIT_KEYS.length).optional(),
  /** Своите редове на Снежана («Добави свое»): до 6, всеки до 60 знака. */
  customBenefits: z.array(z.string().trim().min(1).max(60)).max(6).optional(),
  /** Само махане (null). Нова снимка идва през uploadListingImage. */
  image: z.null().optional(),
  adminNote: z.string().max(2000).nullable().optional(),
  /** Наемът на месец в €: цифри, по желание с десетични (300, 300,50); празно или null = няма сума. */
  rentText: z
    .string()
    .trim()
    .regex(/^(\d{1,6}([.,]\d{1,2})?)?$/)
    .nullable()
    .optional(),
  /** Ключът «показвай в обявата». */
  rentPublic: z.boolean().optional(),
  /** Какво не е включено в наема (публично, под сумата): до 80 знака; празно или null = няма уточнение. */
  rentExcludes: z.string().trim().max(80).nullable().optional(),
  /** «Свободни места»: 1 до 5. */
  seats: z.number().int().min(1).max(MAX_SEATS).optional(),
});

/**
 * Обновява мястото, услугите, предимствата, бележката, наема с ключа и уточнението му и броя на местата;
 * image: null маха снимката.
 * Връща заглавието и адреса (сменят се, когато се смени мястото).
 */
export async function updateListing(id: string, input: z.input<typeof updateSchema>) {
  await requireAdmin();
  if (!idSchema.safeParse(id).success) return fail("Обявата не е намерена.");
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return fail("Невалидни данни.");
  const d = parsed.data;
  const row = await db.query.rentalPositions.findFirst({ where: (p, { eq }) => eq(p.id, id) });
  if (!row) return fail("Обявата не е намерена.");

  const set: Partial<typeof rp.$inferInsert> = { updatedAt: new Date() };
  if (d.categoryId && d.categoryId !== row.categoryId) {
    const category = await db.query.serviceCategories.findFirst({ where: (c, { eq }) => eq(c.id, d.categoryId!) });
    if (!category) return fail("Категорията не е намерена.");
    set.categoryId = category.id;
    set.title = listingTitle(category.slug);
    set.serviceIds = await categoryServiceIds(category.id);
    // Черновата и старият ред без адрес получават нов адрес; пуснатата обява пази своя (връзките от Facebook).
    if (!row.slug || row.status === "draft") set.slug = await freeSlug(set.title, row.id);
    // Стар ред отпреди обявите става обява с явно състояние (видима ли е, не се сменя).
    if (row.status === null) set.status = effectiveStatus(row);
  }
  const categoryId = set.categoryId ?? row.categoryId;
  if (d.serviceIds) {
    const wanted = [...new Set(d.serviceIds)];
    if (wanted.length > 0) {
      if (!categoryId) return fail("Обявата няма категория.");
      const own = await db.query.serviceItems.findMany({
        where: (s, { eq }) => eq(s.categoryId, categoryId),
        columns: { id: true },
      });
      const ownIds = new Set(own.map((s) => s.id));
      if (wanted.some((sid) => !ownIds.has(sid))) return fail("Услугата не е от категорията на обявата.");
    }
    set.serviceIds = wanted;
    // Заглавието следва и услугите: обява само с грим е «за гримьор». Адресът се сменя само в черновата.
    if (categoryId) {
      const cat = await db.query.serviceCategories.findFirst({ where: (c, { eq }) => eq(c.id, categoryId), columns: { slug: true } });
      const title = cat ? listingTitle(cat.slug, await serviceGroups(wanted)) : null;
      if (title && title !== (set.title ?? row.title)) {
        set.title = title;
        if (!row.slug || row.status === "draft") set.slug = await freeSlug(title, row.id);
      }
    }
  }
  if (d.benefits) set.benefits = [...new Set(d.benefits)];
  if (d.customBenefits) set.customBenefits = d.customBenefits;
  if (d.adminNote !== undefined) set.adminNote = d.adminNote?.trim() ? d.adminNote.trim() : null;
  if (d.image === null) set.image = null;
  if (d.rentText !== undefined) set.rentText = d.rentText ? d.rentText : null;
  if (d.rentPublic !== undefined) set.rentPublic = d.rentPublic;
  if (d.rentExcludes !== undefined) set.rentExcludes = d.rentExcludes ? d.rentExcludes : null;
  if (d.seats !== undefined) set.seats = d.seats;
  // Включен ключ без сума не се пази (текстът на Саиф за грешката, част 4).
  const rentPublic = set.rentPublic ?? row.rentPublic;
  const rentText = set.rentText !== undefined ? set.rentText : row.rentText;
  if (rentPublic && !rentText) return fail("Въведи сума или изключи ключа.");

  try {
    await db.update(rp).set(set).where(eq(rp.id, id));
  } catch (e) {
    // Същият адрес, взет междувременно от друга обява (уникален индекс).
    if ((e as { code?: string })?.code === "23505") return fail("Не успях да запазя обявата. Опитай пак.");
    throw e;
  }
  if (d.image === null && row.image) await removeStoredImage(row.image);
  revalidateListing(row.slug);
  if (set.slug && set.slug !== row.slug) revalidateListing(set.slug);
  return { ok: true as const, title: set.title ?? row.title, slug: set.slug ?? row.slug };
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
  // «Заето» при повече от едно място затваря едно място и обявата остава в сегашното си състояние.
  const seat = action === "fill" ? fillSeat(current, row.seats) : null;
  const to = seat ? seat.status : nextStatus(current, action);
  if (!to) return fail(NOT_ALLOWED[action]);
  const more = seat ? { ...extra, seats: seat.seats } : extra;
  if (action === "publish" && (!row.categoryId || !row.slug)) return fail("Обявата няма категория.");

  // Пише само ако редът е още в същото състояние и със същия брой места (две «заето» наведнъж не
  // затварят едно място два пъти).
  const updated = await db
    .update(rp)
    .set({ ...more, status: to, active: to === "published", updatedAt: new Date() })
    .where(
      and(
        eq(rp.id, id),
        row.status === null ? isNull(rp.status) : eq(rp.status, row.status),
        eq(rp.seats, row.seats),
      ),
    )
    .returning({ id: rp.id, seats: rp.seats });
  if (updated.length === 0) return fail("Обявата се смени междувременно. Отвори я пак.");
  revalidateListing(row.slug);
  return { ok: true as const, status: to, seats: updated[0].seats };
}

/** «Публикувай»: чернова → публикувана, после опит за пост във Facebook (резултатът е в `facebook`). */
export async function publishListing(id: string) {
  await requireAdmin();
  const result = await transition(id, "publish", { publishedAt: new Date() });
  if (!result.ok) return result;
  const facebook = await postToFacebook(id);
  return { ...result, facebook };
}

/**
 * Постът във Facebook след публикуване. Никога не хвърля и никога не мълчи: всеки изход
 * (излезе, не е настроено, ключът не важи, грешка) се връща към формата и се пише в лога на сървъра.
 */
async function postToFacebook(id: string): Promise<FacebookPostResult> {
  try {
    const row = await db.query.rentalPositions.findFirst({
      where: (p, { eq }) => eq(p.id, id),
      columns: { slug: true, categoryId: true, serviceIds: true, fbPostId: true, seats: true, rentText: true, rentPublic: true, rentExcludes: true },
    });
    if (!row?.slug) return { status: "error", reason: "no_slug" };
    if (row.fbPostId) return { status: "posted", postId: row.fbPostId, postUrl: `https://www.facebook.com/${row.fbPostId}` };
    const category = row.categoryId
      ? await db.query.serviceCategories.findFirst({ where: (c, { eq }) => eq(c.id, row.categoryId!), columns: { slug: true } })
      : null;
    // Метката различава кликовете от поста (came_from на запитването); без бисквитки.
    const link = `${siteConfig.url}/karieri/${row.slug}?utm_source=facebook&utm_medium=post&utm_campaign=${row.slug}`;
    const result = await postListingToFacebookPage({
      message: listingFacebookPost(listingPosition(category?.slug ?? "", await serviceGroups(row.serviceIds ?? [])), link, {
        seats: row.seats,
        rent: row.rentPublic ? row.rentText : null,
        rentExcludes: row.rentExcludes,
      }),
      link,
    });
    if (result.status === "posted") {
      // Постът е излязъл: неуспешен запис на номера му не го прави грешка за Снежана.
      await db
        .update(rp)
        .set({ fbPostId: result.postId, fbPostedAt: new Date() })
        .where(eq(rp.id, id))
        .catch((e) => console.error(`[rental] Facebook post ${result.postId} not saved for listing ${id}`, e));
    } else {
      console.warn(`[rental] Facebook post for listing ${id}: ${result.status}${"reason" in result ? ` (${result.reason})` : ""}`);
    }
    return result;
  } catch (e) {
    console.error(`[rental] Facebook post for listing ${id} failed`, e);
    return { status: "error", reason: "exception" };
  }
}

/** «Спри»: публикувана → спряна (не се вижда). */
export async function pauseListing(id: string) {
  await requireAdmin();
  return transition(id, "pause");
}

/**
 * «Заето от <специалист>»: затваря едно място. При повече свободни обявата остава публикувана с едно място
 * по-малко; при последното става заета. Специалистът се записва (последният, заел място).
 */
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
  const original = Buffer.from(await file.arrayBuffer());
  const type = sniffImageType(original.subarray(0, 16));
  if (!type) return fail("Позволени са само JPG, PNG и WebP изображения.");
  // Местоположението в снимката е лични данни: в хранилището влиза само копие без метаданни, в WebP.
  const buffer = await stripToWebp(original);
  if (!buffer) return fail(IMAGE_NOT_READABLE);

  const row = await db.query.rentalPositions.findFirst({
    where: (p, { eq }) => eq(p.id, id),
    columns: { id: true, slug: true, image: true },
  });
  if (!row) return fail("Обявата не е намерена.");

  const s = storage();
  if (!s) return fail("Качването не е настроено (липсват ключовете за хранилището).");
  await s.client.storage.createBucket(BUCKET, { public: true }).catch(() => {}); // idempotent

  // Нов път всеки път: Facebook и CDN кешират картината по адрес.
  const path = `${row.id}-${Date.now()}.webp`;
  const { error } = await s.client.storage.from(BUCKET).upload(path, buffer, { contentType: "image/webp" });
  if (error) return fail("Грешка при качване. Опитай пак.");
  const url = `${s.url}/storage/v1/object/public/${BUCKET}/${path}`;

  await db.update(rp).set({ image: url, updatedAt: new Date() }).where(eq(rp.id, row.id));
  if (row.image && row.image !== url) await removeStoredImage(row.image);
  revalidateListing(row.slug);
  return { ok: true as const, url };
}
