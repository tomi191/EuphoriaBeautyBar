"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { requireAdmin } from "@/lib/actions/auth-guard";
import { auth } from "@/lib/auth";

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
  await db
    .update(schema.resources)
    .set({ name: d.name, kind: d.kind, color: d.color ?? null, image: d.image ?? null, bio: d.bio ?? null, active: d.active, updatedAt: new Date() })
    .where(eq(schema.resources.id, id));
  revalidate();
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

export async function deleteResource(id: string) {
  await requireAdmin();
  try {
    await db.delete(schema.resources).where(eq(schema.resources.id, id));
  } catch {
    // FK restrict — има записани часове за този изпълнител; деактивирай вместо изтриване
    await db.update(schema.resources).set({ active: false, updatedAt: new Date() }).where(eq(schema.resources.id, id));
  }
  revalidate();
}
