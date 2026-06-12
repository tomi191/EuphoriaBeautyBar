"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { requireAdmin } from "@/lib/actions/auth-guard";

const serviceItemSchema = z.object({
  categoryId: z.string(),
  groupTitle: z.string().min(2),
  name: z.string().min(2),
  price: z.number().positive(),
  priceMax: z.number().positive().nullable().optional(),
  priceFrom: z.boolean().default(false),
  currency: z.string().min(1).default("лв"),
  duration: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  durationMin: z.number().int().positive().default(30),
  bufferMin: z.number().int().min(0).default(10),
  activeMin: z.coerce.number().int().min(0).default(0),
  processingMin: z.coerce.number().int().min(0).default(0),
  bookableOnline: z.boolean().default(true),
});

export type ServiceItemInput = z.infer<typeof serviceItemSchema>;

/** Опреснява всички места, които показват цени/услуги от каталога. */
function revalidateCatalog() {
  revalidatePath("/admin/services");
  revalidatePath("/uslugi");
  revalidatePath("/uslugi/[slug]", "page");
  revalidatePath("/"); // home — featured services
  revalidatePath("/zapazi-chas"); // онлайн записване
}

export async function createServiceItem(input: ServiceItemInput) {
  await requireAdmin();
  const data = serviceItemSchema.parse(input);
  await db.insert(schema.serviceItems).values({
    id: nanoid(),
    ...data,
    priceMax: data.priceMax ?? null,
    duration: data.duration ?? null,
    description: data.description ?? null,
    sortOrder: 0,
  });
  revalidateCatalog();
}

export async function updateServiceItem(id: string, input: ServiceItemInput) {
  await requireAdmin();
  const data = serviceItemSchema.parse(input);
  await db
    .update(schema.serviceItems)
    .set({
      ...data,
      priceMax: data.priceMax ?? null,
      duration: data.duration ?? null,
      description: data.description ?? null,
    })
    .where(eq(schema.serviceItems.id, id));
  revalidateCatalog();
}

export async function deleteServiceItem(id: string) {
  await requireAdmin();
  await db.delete(schema.serviceItems).where(eq(schema.serviceItems.id, id));
  revalidateCatalog();
}
