"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { requireAdmin } from "@/lib/actions/auth-guard";
import { auth } from "@/lib/auth";
import { FUTURE_STATUSES } from "@/lib/booking/future-bookings";
import { releaseListingsFilledBy } from "@/lib/rental/release";

const resourceSchema = z.object({
  name: z.string().min(2, "Минимум 2 символа"),
  kind: z.enum(["hair", "nails", "cosmetics"]),
  color: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  active: z.boolean().default(true),
});

export type ResourceInput = z.infer<typeof resourceSchema>;

function revalidate() {
  revalidatePath("/admin/resources");
  revalidatePath("/admin/bookings");
  revalidatePath("/zapazi-chas");
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
  revalidate();
  return { id };
}

export async function updateResource(id: string, input: ResourceInput) {
  await requireAdmin();
  const d = resourceSchema.parse(input);
  // „Активен" е само видимостта пред клиентите. Скрит изпълнител пази входа, Telegram и известията.
  await db
    .update(schema.resources)
    .set({ name: d.name, kind: d.kind, color: d.color ?? null, image: d.image ?? null, bio: d.bio ?? null, active: d.active, updatedAt: new Date() })
    .where(eq(schema.resources.id, id));
  revalidate();
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

export async function deleteResource(id: string) {
  await requireAdmin();
  try {
    await db.delete(schema.resources).where(eq(schema.resources.id, id));
  } catch {
    // FK restrict — има записани часове за този изпълнител; вместо изтриване приключва
    // сътрудничеството (скрит, без вход), историята на часовете остава.
    await endStaffAccess(id);
    await releaseListingsFilledBy(id);
  }
  revalidate();
}
