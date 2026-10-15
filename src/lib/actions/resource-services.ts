"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { requireStaff } from "@/lib/actions/auth-guard";
import { KIND_BY_SLUG } from "@/lib/booking/kind";
import { validatePrice, validateServiceTiming } from "@/lib/booking/service-rules";

function revalidate() {
  revalidatePath("/staff/services");
  revalidatePath("/zapazi-chas");
  revalidatePath("/uslugi");
  revalidatePath("/uslugi/[slug]", "page");
  // Статичните landing-и рендират цени от каталога — иначе замръзват до deploy.
  revalidatePath("/uslugi/boyadisvane-na-kosa-varna");
  revalidatePath("/uslugi/kichuri-varna");
  revalidatePath("/uslugi/pochistvane-na-litse-varna");
  revalidatePath("/uslugi/kola-maska-varna");
  revalidatePath("/uslugi/vezhdi-i-migli-varna");
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
  // Ownership по kind (като в updateMyService): иначе крафтнат serviceItemId от чужд тип
  // би създал оферта за услуга, която изпълнителят не може да извършва.
  const target = await db.query.serviceItems.findFirst({ where: (s, { eq }) => eq(s.id, serviceItemId) });
  if (!target) return { ok: false as const, error: "Услугата не е намерена." };
  const targetCat = await db.query.serviceCategories.findFirst({ where: (c, { eq }) => eq(c.id, target.categoryId) });
  if (!targetCat || KIND_BY_SLUG[targetCat.slug] !== resource.kind) {
    return { ok: false as const, error: "Услугата не е от твоя тип." };
  }
  const existing = await db.query.resourceServices.findFirst({
    where: (rs, { and, eq }) => and(eq(rs.resourceId, resource.id), eq(rs.serviceItemId, serviceItemId)),
  });
  if (existing) {
    await db
      .update(schema.resourceServices)
      .set({ active: !existing.active, updatedAt: new Date() })
      .where(eq(schema.resourceServices.id, existing.id));
  } else {
    const item = target;
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
  // Числовите граници са в service-rules (български съобщения); тук само формата.
  price: z.number(),
  priceMax: z.number().nullable().optional(),
  priceFrom: z.boolean(),
  currency: z.string().min(1),
  durationMin: z.number(),
  bufferMin: z.number(),
  activeMin: z.number().optional(),
  processingMin: z.number().optional(),
});

/**
 * Изпълнителят редактира собствената си цена/продължителност за дадена услуга.
 * UPSERT: ако още няма оферта (не е отметнал услугата изрично), задаването на
 * цена я СЪЗДАВА — иначе UPDATE без съществуващ ред мълчаливо губи промяната.
 */
export async function updateMyService(serviceItemId: string, input: z.infer<typeof updateSchema>) {
  const { resource } = await requireStaff();
  const parsedInput = updateSchema.safeParse(input);
  if (!parsedInput.success) return { ok: false as const, error: "Провери въведените данни." };
  const d = parsedInput.data;
  // Цена + собствено време (кратно на 5, граници). Number("") = 0 → „Въведи минути…".
  const baseErr =
    validatePrice(d.price, d.priceMax) ??
    validateServiceTiming({ durationMin: d.durationMin, bufferMin: d.bufferMin, activeMin: 0, processingMin: 0 });
  if (baseErr) return { ok: false as const, error: baseErr };
  // Ownership по kind: activeMin/processingMin се пишат ГЛОБАЛНО в каталога → крафтнат
  // serviceItemId от чужд тип не бива да променя чужда услуга.
  const target = await db.query.serviceItems.findFirst({ where: (s, { eq }) => eq(s.id, serviceItemId) });
  if (!target) return { ok: false as const, error: "Услугата не е намерена." };
  const targetCat = await db.query.serviceCategories.findFirst({ where: (c, { eq }) => eq(c.id, target.categoryId) });
  if (!targetCat || KIND_BY_SLUG[targetCat.slug] !== resource.kind) {
    return { ok: false as const, error: "Услугата не е от твоя тип." };
  }
  const { activeMin, processingMin, ...own } = d;
  const existing = await db.query.resourceServices.findFirst({
    where: (rs, { and, eq }) => and(eq(rs.resourceId, resource.id), eq(rs.serviceItemId, serviceItemId)),
  });
  // Активно/престой са ГЛОБАЛНИ (service_items) и важат за всеки изпълнител, а времетраенето
  // може да е различно по изпълнител → сумата се сверява с НАЙ-КРАТКОТО време, с което някой
  // предлага услугата. Иначе при колега с по-кратко време прозорецът излиза след края на часа.
  if (activeMin !== undefined || processingMin !== undefined) {
    const nextActive = activeMin ?? target.activeMin;
    const nextProcessing = processingMin ?? target.processingMin;
    // Форма/кратност/10-мин праг: с най-голямо време, за да не се дублира проверката за сумата.
    const shapeErr = validateServiceTiming({ durationMin: 600, bufferMin: d.bufferMin, activeMin: nextActive, processingMin: nextProcessing });
    if (shapeErr) return { ok: false as const, error: shapeErr };
    const offers = await db.query.resourceServices.findMany({
      where: (rs, { and, eq }) => and(eq(rs.serviceItemId, serviceItemId), eq(rs.active, true)),
    });
    const durations = [
      target.durationMin,
      d.durationMin,
      ...offers.filter((o) => o.resourceId !== resource.id).map((o) => o.durationMin),
    ];
    const minDuration = Math.min(...durations);
    if (nextActive + nextProcessing > minDuration) {
      return {
        ok: false as const,
        error: `Активни + престой (${nextActive + nextProcessing} мин) може да са най-много ${minDuration} мин, колкото е най-краткото време, с което колега предлага услугата.`,
      };
    }
  }
  if (existing) {
    await db
      .update(schema.resourceServices)
      .set({ ...own, priceMax: own.priceMax ?? null, updatedAt: new Date() })
      .where(eq(schema.resourceServices.id, existing.id));
  } else {
    await db.insert(schema.resourceServices).values({
      id: nanoid(),
      resourceId: resource.id,
      serviceItemId,
      ...own,
      priceMax: own.priceMax ?? null,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  // Престоят е характеристика на услугата (глобален) → пише се в каталога.
  if (activeMin !== undefined || processingMin !== undefined) {
    await db
      .update(schema.serviceItems)
      .set({
        ...(activeMin !== undefined ? { activeMin } : {}),
        ...(processingMin !== undefined ? { processingMin } : {}),
      })
      .where(eq(schema.serviceItems.id, serviceItemId));
  }
  revalidate();
  return { ok: true as const };
}

/**
 * Включва/изключва ОНЛАЙН ЗАПИС за услуга (отделно от „Предлагам"). Изключен онлайн
 * запис → услугата остава в ценоразписа с цена, но клиентът вижда телефон вместо
 * форма за час. Спирането изисква въведен телефон за връзка (иначе клиентът няма
 * как да запази → разочарование).
 */
export async function toggleMyServiceOnline(serviceItemId: string) {
  const { resource } = await requireStaff();
  const existing = await db.query.resourceServices.findFirst({
    where: (rs, { and, eq }) => and(eq(rs.resourceId, resource.id), eq(rs.serviceItemId, serviceItemId)),
  });
  if (!existing) return { ok: false as const, error: "Първо включи услугата (Предлагам)." };
  // Спиране (true → false) изисква телефон за връзка.
  if (existing.onlineBookable && !resource.phone?.trim()) {
    return { ok: false as const, error: "Първо въведи телефон за връзка в профила си." };
  }
  await db
    .update(schema.resourceServices)
    .set({ onlineBookable: !existing.onlineBookable, updatedAt: new Date() })
    .where(eq(schema.resourceServices.id, existing.id));
  revalidate();
  return { ok: true as const };
}

const createSchema = z.object({
  name: z.string().min(2, "Минимум 2 символа"),
  groupTitle: z.string().min(2),
  /** Slug на категорията — нужен само ако групата е нова (не се извежда от нея). */
  categorySlug: z.string().nullable().optional(),
  price: z.number(),
  priceFrom: z.boolean().default(false),
  durationMin: z.number(),
  bufferMin: z.number().default(10),
});

/**
 * Изпълнителят добавя НОВА услуга в каталога (service_items) + автоматично я
 * предлага (resource_services). Така тя се появява и в ценоразписа на сайта
 * (/uslugi), и при записване на час — пълна симбиоза с каталога.
 */
export async function createMyService(input: z.infer<typeof createSchema>) {
  const { resource } = await requireStaff();
  const parsedInput = createSchema.safeParse(input);
  if (!parsedInput.success) return { ok: false as const, error: parsedInput.error.issues[0]?.message ?? "Провери въведените данни." };
  const d = parsedInput.data;
  const baseErr =
    validatePrice(d.price) ??
    validateServiceTiming({ durationMin: d.durationMin, bufferMin: d.bufferMin, activeMin: 0, processingMin: 0 });
  if (baseErr) return { ok: false as const, error: baseErr };

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

  // Валутата следва съществуващите услуги в категорията; € по подразбиране (целият
  // каталог е в €), за да не влезе левова цена в priceEur snapshot-а.
  const sibling = await db.query.serviceItems.findFirst({ where: (s, { eq }) => eq(s.categoryId, categoryId), columns: { currency: true } });
  const currency = sibling?.currency ?? "€";

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
