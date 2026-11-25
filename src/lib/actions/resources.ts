"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { requireAdmin } from "@/lib/actions/auth-guard";
import { auth } from "@/lib/auth";
import { FUTURE_STATUSES } from "@/lib/booking/future-bookings";
import { isEnded } from "@/lib/booking/ended";
import { releaseListingsFilledBy } from "@/lib/rental/release";
import { setConsent } from "@/lib/data/tenant-consent";
import { processTeamPhoto, removeTeamPhotoIfUnused, TEAM_BUCKET, TEAM_PHOTO_ERRORS, teamStorage } from "@/lib/images/team-photo";
import { endResourceCampaigns } from "@/lib/campaigns/lifecycle";

const resourceSchema = z.object({
  name: z.string().min(2, "Минимум 2 символа"),
  kind: z.enum(["hair", "nails", "cosmetics"]),
  color: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  active: z.boolean().default(true),
  /** Писмено съгласие за първо име и снимка на сайта (само за специалист под наем). */
  publicConsent: z.boolean().optional(),
});

export type ResourceInput = z.infer<typeof resourceSchema>;

function revalidate() {
  revalidatePath("/admin/resources");
  revalidatePath("/admin/bookings");
  revalidatePath("/zapazi-chas");
  revalidatePath("/za-nas");
}

export async function createResource(input: ResourceInput) {
  await requireAdmin();
  const d = resourceSchema.parse(input);
  const id = nanoid();
  await db.insert(schema.resources).values({
    id,
    name: d.name,
    kind: d.kind,
    color: d.color ?? null,
    image: d.image ?? null,
    bio: d.bio ?? null,
    active: d.active,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  if (d.publicConsent !== undefined) await setConsent(id, d.publicConsent);
  revalidate();
  return { id };
}

export async function updateResource(id: string, input: ResourceInput) {
  await requireAdmin();
  const d = resourceSchema.parse(input);
  const before = await db.query.resources.findFirst({ where: (r, { eq }) => eq(r.id, id), columns: { image: true } });
  // „Активен" е само видимостта пред клиентите. Скрит изпълнител пази входа, Telegram и известията.
  await db
    .update(schema.resources)
    .set({ name: d.name, kind: d.kind, color: d.color ?? null, image: d.image ?? null, bio: d.bio ?? null, active: d.active, updatedAt: new Date() })
    .where(eq(schema.resources.id, id));
  if (d.publicConsent !== undefined) await setConsent(id, d.publicConsent);
  // Сменена или махната снимка: старият файл в хранилището се трие (само ако е наш и никой не го ползва).
  if (before?.image && before.image !== (d.image ?? null)) await removeTeamPhotoIfUnused(before.image);
  revalidate();
}

/**
 * «Качи снимка» във формата на изпълнителя: проверка по байтовете, без данни за място, WebP.
 * Връща адреса; записва се в изпълнителя чак със «Запази» (updateResource/createResource).
 */
export async function uploadResourcePhoto(formData: FormData) {
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false as const, error: TEAM_PHOTO_ERRORS.none };
  if (file.size > 5 * 1024 * 1024) return { ok: false as const, error: TEAM_PHOTO_ERRORS.tooBig };
  const res = await processTeamPhoto(Buffer.from(await file.arrayBuffer()));
  if (!res.ok) return res;
  const s = teamStorage();
  if (!s) return { ok: false as const, error: "Качването не е настроено (липсват ключовете за хранилището)." };
  await s.client.storage.createBucket(TEAM_BUCKET, { public: true }).catch(() => {}); // idempotent
  // Нов адрес всеки път: CDN и картините в сайта кешират по адрес.
  const path = `admin-${nanoid(10)}-${Date.now()}.webp`;
  const { error } = await s.client.storage.from(TEAM_BUCKET).upload(path, res.webp, { contentType: "image/webp" });
  if (error) return { ok: false as const, error: "Грешка при качване. Опитай пак." };
  return { ok: true as const, url: `${s.prefix}${path}` };
}

/** Качена, но незапазена снимка (затворена форма, «Махни» или нова снимка): трие се, ако никой не я ползва. */
export async function discardResourcePhoto(url: string) {
  await requireAdmin();
  await removeTeamPhotoIfUnused(url);
}

/**
 * Край на сътрудничеството: скрива изпълнителя, откача и изтрива входа му (сесии, парола,
 * passkey), разкача Telegram и трие push абонаментите. Часовете и оборотът остават: сочат
 * към изпълнителя, не към входа (bookings.createdBy е само текст, без връзка). Имейлът се
 * освобождава → при връщане админът му прави нов вход с бутона „Вход". Вход на админ не
 * се трие (Снежана може да е и изпълнител), само се откача.
 * НЕ се експортира: в "use server" файл всеки export е публично извикваем action.
 */
async function endStaffAccess(resourceId: string) {
  const resource = await db.query.resources.findFirst({ where: (r, { eq }) => eq(r.id, resourceId) });
  if (!resource) return false;
  await db
    .update(schema.resources)
    .set({ active: false, userId: null, telegramChatId: null, telegramLinkToken: null, updatedAt: new Date() })
    .where(eq(schema.resources.id, resourceId));
  await db.delete(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.resourceId, resourceId));
  const userId = resource.userId;
  if (userId) {
    const u = await db.query.user.findFirst({ where: (x, { eq }) => eq(x.id, userId), columns: { role: true } });
    if (u && u.role !== "admin") {
      // Изрично, без да разчитаме на cascade в живата база: първо сесиите и паролата, после самия вход.
      await db.delete(schema.session).where(eq(schema.session.userId, userId));
      await db.delete(schema.passkey).where(eq(schema.passkey.userId, userId));
      await db.delete(schema.account).where(eq(schema.account.userId, userId));
      await db.delete(schema.user).where(eq(schema.user.id, userId));
    }
  }
  return true;
}

/**
 * „Приключи сътрудничеството" от прозореца на изпълнителя. Нищо не се отказва; връща колко бъдещи
 * часа има и кои места под наем, заети от него, са станали «спрени» (да ги предложим на Снежана).
 */
export async function endCooperation(id: string) {
  await requireAdmin();
  // Решение 24: промоциите спират и постовете му във Facebook се трият (преди да се махне Telegram-ът му).
  await endResourceCampaigns(id).catch((e) => console.error("[campaigns] край на сътрудничеството:", e instanceof Error ? e.message : String(e)));
  if (!(await endStaffAccess(id))) return { ok: false as const, error: "Изпълнителят не е намерен." };
  const pausedListings = await releaseListingsFilledBy(id);
  revalidate();
  if (pausedListings.length) revalidatePath("/admin/positions");
  for (const l of pausedListings) if (l.slug) revalidatePath(`/karieri/${l.slug}`);
  const future = await db.query.bookings.findMany({
    where: (b, { and, eq, gt, inArray }) =>
      and(eq(b.resourceId, id), gt(b.startAt, new Date()), inArray(b.status, FUTURE_STATUSES)),
    columns: { id: true },
  });
  return { ok: true as const, futureBookings: future.length, pausedListings };
}

const staffSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Минимум 8 символа"),
  name: z.string().min(2),
});

/** Създава вход (акаунт role=staff) за изпълнител и го връзва към resource. */
export async function createStaffAccount(resourceId: string, input: z.infer<typeof staffSchema>) {
  await requireAdmin();
  const d = staffSchema.parse(input);

  const resource = await db.query.resources.findFirst({ where: (r, { eq }) => eq(r.id, resourceId) });
  if (!resource) return { ok: false as const, error: "Изпълнителят не е намерен." };
  if (resource.userId) return { ok: false as const, error: "Този изпълнител вече има вход." };

  const existing = await db.query.user.findFirst({ where: (u, { eq }) => eq(u.email, d.email) });
  if (existing) return { ok: false as const, error: "Имейлът вече се използва." };

  const ctx = await auth.$context;
  const hashed = await ctx.password.hash(d.password);
  const userId = nanoid();
  const now = new Date();

  await db.insert(schema.user).values({
    id: userId,
    name: d.name,
    email: d.email,
    emailVerified: true,
    role: "staff",
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(schema.account).values({
    id: nanoid(),
    accountId: userId,
    providerId: "credential",
    userId,
    password: hashed,
    createdAt: now,
    updatedAt: now,
  });
  await db.update(schema.resources).set({ userId, updatedAt: now }).where(eq(schema.resources.id, resourceId));

  revalidate();
  return { ok: true as const };
}

/** Админът задава НОВА парола на изпълнител (забравена парола). Затваря всички негови сесии. */
export async function resetStaffPassword(resourceId: string, newPassword: string) {
  await requireAdmin();
  if (newPassword.length < 8) return { ok: false as const, error: "Минимум 8 символа." };

  const resource = await db.query.resources.findFirst({ where: (r, { eq }) => eq(r.id, resourceId) });
  if (!resource?.userId) return { ok: false as const, error: "Изпълнителят няма вход." };

  const ctx = await auth.$context;
  const hashed = await ctx.password.hash(newPassword);
  await db
    .update(schema.account)
    .set({ password: hashed, updatedAt: new Date() })
    .where(and(eq(schema.account.userId, resource.userId), eq(schema.account.providerId, "credential")));
  // Затвори активните сесии — старата парола/устройства спират да важат.
  await db.delete(schema.session).where(eq(schema.session.userId, resource.userId));

  return { ok: true as const };
}

/** FK restrict (23503): изпълнителят има история (часове или промоции), която не се трие. */
function isForeignKeyViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } } | null;
  return e?.code === "23503" || e?.cause?.code === "23503";
}

/**
 * Изпълнител без история се трие. С история (часове, промоции) не се трие: сътрудничеството
 * приключва (скрит, без вход), ако още не е, и админът получава съобщение защо е така.
 */
export async function deleteResource(id: string): Promise<void | { message: string }> {
  await requireAdmin();
  const resource = await db.query.resources.findFirst({ where: (r, { eq }) => eq(r.id, id) });
  if (!resource) return;
  try {
    await db.delete(schema.resources).where(eq(schema.resources.id, id));
  } catch (err) {
    if (!isForeignKeyViolation(err)) throw err;
    if (!isEnded(resource)) {
      await endStaffAccess(id);
      await releaseListingsFilledBy(id);
    }
    const booking = await db.query.bookings.findFirst({ where: (b, { eq }) => eq(b.resourceId, id), columns: { id: true } });
    revalidate();
    return {
      message: `${resource.name} има записани ${booking ? "часове" : "промоции"} в историята, затова не се трие. Сътрудничеството е приключено: няма вход и не се вижда на сайта.`,
    };
  }
  revalidate();
}
