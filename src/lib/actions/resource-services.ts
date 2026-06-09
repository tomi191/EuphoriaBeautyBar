"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { requireStaff } from "@/lib/actions/auth-guard";

function revalidate() {
  revalidatePath("/staff/services");
  revalidatePath("/zapazi-chas");
  revalidatePath("/uslugi");
  revalidatePath("/uslugi/[slug]", "page");
  revalidatePath("/");
}

/** Включва/изключва услуга от каталога за текущия изпълнител (със стойности по подразбиране от каталога). */
export async function toggleMyService(serviceItemId: string) {
  const { resource } = await requireStaff();
  const existing = await db.query.resourceServices.findFirst({
    where: (rs, { and, eq }) => and(eq(rs.resourceId, resource.id), eq(rs.serviceItemId, serviceItemId)),
  });
  if (existing) {
    await db.delete(schema.resourceServices).where(eq(schema.resourceServices.id, existing.id));
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

/** Изпълнителят редактира собствената си цена/продължителност за дадена услуга. */
export async function updateMyService(serviceItemId: string, input: z.infer<typeof updateSchema>) {
  const { resource } = await requireStaff();
  const d = updateSchema.parse(input);
  await db
    .update(schema.resourceServices)
    .set({ ...d, priceMax: d.priceMax ?? null, updatedAt: new Date() })
    .where(and(eq(schema.resourceServices.resourceId, resource.id), eq(schema.resourceServices.serviceItemId, serviceItemId)));
  revalidate();
  return { ok: true as const };
}
