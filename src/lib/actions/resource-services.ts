"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { requireStaff } from "@/lib/actions/auth-guard";
import { KIND_BY_SLUG } from "@/lib/booking/kind";

function revalidate() {
  revalidatePath("/staff/services");
  revalidatePath("/zapazi-chas");
  revalidatePath("/uslugi");
  revalidatePath("/uslugi/[slug]", "page");
  revalidatePath("/");
}

/**
 * Включва/изключва услуга за текущия изпълнител. При ИЗКЛЮЧВАНЕ НЕ трием реда, а
 * слагаме active=false — така въведената цена се ПАЗИ и при повторно включване се
 * връща последната цена на изпълнителя, не каталожната. Нов ред (първо включване)
 * стартира със стойности по подразбиране от каталога.
 */
export async function toggleMyService(serviceItemId: string) {
  const { resource } = await requireStaff();
  const existing = await db.query.resourceServices.findFirst({
    where: (rs, { and, eq }) => and(eq(rs.resourceId, resource.id), eq(rs.serviceItemId, serviceItemId)),
  });
  if (existing) {
    await db
      .update(schema.resourceServices)
      .set({ active: !existing.active, updatedAt: new Date() })
      .where(eq(schema.resourceServices.id, existing.id));
  } else {
    const item = await db.query.serviceItems.findFirst({ where: (s, { eq }) => eq(s.id, serviceItemId) });
    if (!item) return { ok: false as const };
    await db.insert(schema.resourceServices).values({
      id: nanoid(),
      resourceId: resource.id,
      serviceItemId,
      price: item.price,
      priceMax: item.priceMax,
      priceFrom: item.priceFrom,
      currency: item.currency,
      durationMin: item.durationMin,
      bufferMin: item.bufferMin,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  revalidate();
  return { ok: true as const };
}

const updateSchema = z.object({
  price: z.number().positive(),
  priceMax: z.number().positive().nullable().optional(),
  priceFrom: z.boolean(),
  currency: z.string().min(1),
  durationMin: z.number().int().positive(),
  bufferMin: z.number().int().min(0),
});

/**
 * Изпълнителят редактира собствената си цена/продължителност за дадена услуга.
 * UPSERT: ако още няма оферта (не е отметнал услугата изрично), задаването на
 * цена я СЪЗДАВА — иначе UPDATE без съществуващ ред мълчаливо губи промяната.
 */
export async function updateMyService(serviceItemId: string, input: z.infer<typeof updateSchema>) {
  const { resource } = await requireStaff();
  const d = updateSchema.parse(input);
  const existing = await db.query.resourceServices.findFirst({
    where: (rs, { and, eq }) => and(eq(rs.resourceId, resource.id), eq(rs.serviceItemId, serviceItemId)),
  });
  if (existing) {
    await db
      .update(schema.resourceServices)
      .set({ ...d, priceMax: d.priceMax ?? null, updatedAt: new Date() })
      .where(eq(schema.resourceServices.id, existing.id));
  } else {
    await db.insert(schema.resourceServices).values({
      id: nanoid(),
      resourceId: resource.id,
      serviceItemId,
      ...d,
      priceMax: d.priceMax ?? null,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  revalidate();
  return { ok: true as const };
}

const createSchema = z.object({
  name: z.string().min(2, "Минимум 2 символа"),
  groupTitle: z.string().min(2),
  /** Slug на категорията — нужен само ако групата е нова (не се извежда от нея). */
  categorySlug: z.string().nullable().optional(),
  price: z.number().positive(),
  priceFrom: z.boolean().default(false),
  durationMin: z.number().int().positive(),
  bufferMin: z.number().int().min(0).default(10),
});

/**
 * Изпълнителят добавя НОВА услуга в каталога (service_items) + автоматично я
 * предлага (resource_services). Така тя се появява и в ценоразписа на сайта
 * (/uslugi), и при записване на час — пълна симбиоза с каталога.
 */
export async function createMyService(input: z.infer<typeof createSchema>) {
  const { resource } = await requireStaff();
  const d = createSchema.parse(input);

  // Категория: от съществуваща група за неговия kind, иначе от подадения slug.
  const cats = await db.query.serviceCategories.findMany();
  const myCats = cats.filter((c) => KIND_BY_SLUG[c.slug] === resource.kind);
  if (myCats.length === 0) return { ok: false as const, error: "Няма категория за твоя тип услуги." };

  const myCatIds = new Set(myCats.map((c) => c.id));
  const groupOwner = await db.query.serviceItems.findFirst({
    where: (s, { eq }) => eq(s.groupTitle, d.groupTitle.trim()),
  });

  let categoryId: string;
  if (groupOwner && myCatIds.has(groupOwner.categoryId)) {
    categoryId = groupOwner.categoryId; // съществуваща група → нейната категория
  } else {
    const requested = d.categorySlug ? myCats.find((c) => c.slug === d.categorySlug) : undefined;
    categoryId = (requested ?? myCats[0]).id; // нова група → избраната (или първата) категория
  }

  // Дублиращо име в каталога → не създаваме втора еднаква услуга.
  const dup = await db.query.serviceItems.findFirst({ where: (s, { eq }) => eq(s.name, d.name.trim()) });
  if (dup) return { ok: false as const, error: "Услуга с това име вече съществува в каталога." };

  // Валутата следва съществуващите услуги в категорията (без хардкод € → смесена валута).
  const sibling = await db.query.serviceItems.findFirst({ where: (s, { eq }) => eq(s.categoryId, categoryId), columns: { currency: true } });
  const currency = sibling?.currency ?? "лв";

  const itemId = nanoid();
  await db.insert(schema.serviceItems).values({
    id: itemId,
    categoryId,
    groupTitle: d.groupTitle.trim(),
    name: d.name.trim(),
    price: d.price,
    priceMax: null,
    priceFrom: d.priceFrom,
    currency,
    duration: null,
    description: null,
    sortOrder: 999, // в края на групата; admin може да пренареди
    durationMin: d.durationMin,
    bufferMin: d.bufferMin,
    bookableOnline: true,
  });
  await db.insert(schema.resourceServices).values({
    id: nanoid(),
    resourceId: resource.id,
    serviceItemId: itemId,
    price: d.price,
    priceMax: null,
    priceFrom: d.priceFrom,
    currency,
    durationMin: d.durationMin,
    bufferMin: d.bufferMin,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  revalidate();
  revalidatePath("/admin/services");
  return { ok: true as const, id: itemId };
}

/**
 * Изтрива услуга от каталога — позволено САМО ако никой друг изпълнител не я
 * предлага (за да не се счупи чужд ценоразпис). Минали записи на часове пазят
 * името си (bookings.service_item_id е ON DELETE SET NULL).
 */
export async function deleteMyService(serviceItemId: string) {
  const { resource } = await requireStaff();

  const item = await db.query.serviceItems.findFirst({ where: (s, { eq }) => eq(s.id, serviceItemId) });
  if (!item) return { ok: false as const, error: "Услугата не е намерена." };

  const cat = await db.query.serviceCategories.findFirst({ where: (c, { eq }) => eq(c.id, item.categoryId) });
  if (!cat || KIND_BY_SLUG[cat.slug] !== resource.kind) {
    return { ok: false as const, error: "Услугата не е от твоя тип." };
  }

  // Ownership: изтриваш само услуга, която сам предлагаш — иначе staff с
  // правилния kind би могъл да трие каталожни услуги, добавени от админ или
  // от напуснал изпълнител.
  const myOffer = await db.query.resourceServices.findFirst({
    where: (rs) => and(eq(rs.serviceItemId, serviceItemId), eq(rs.resourceId, resource.id)),
  });
  if (!myOffer) {
    return { ok: false as const, error: "Не предлагаш тази услуга — само админ може да я изтрие от каталога." };
  }

  const otherOffer = await db.query.resourceServices.findFirst({
    where: (rs) => and(eq(rs.serviceItemId, serviceItemId), ne(rs.resourceId, resource.id)),
  });
  if (otherOffer) {
    return { ok: false as const, error: "Друг изпълнител също предлага тази услуга — само админ може да я изтрие." };
  }

  await db.delete(schema.serviceItems).where(eq(schema.serviceItems.id, serviceItemId));
  revalidate();
  revalidatePath("/admin/services");
  return { ok: true as const };
}
