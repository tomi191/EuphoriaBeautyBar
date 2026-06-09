"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { requireAdmin } from "@/lib/actions/auth-guard";

const positionSchema = z.object({
  title: z.string().min(2, "Минимум 2 символа"),
  type: z.string().min(2),
  description: z.string().min(5),
  skills: z.array(z.string()).default([]),
  active: z.boolean().default(true),
});

export type PositionInput = z.infer<typeof positionSchema>;

function revalidateAll() {
  revalidatePath("/admin/positions");
  revalidatePath("/karieri");
  revalidatePath("/za-nas");
  revalidatePath("/");
}

export async function createPosition(input: PositionInput) {
  await requireAdmin();
  const data = positionSchema.parse(input);
  const id = nanoid();
  await db.insert(schema.rentalPositions).values({
    id,
    ...data,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  revalidateAll();
  return { id };
}

export async function updatePosition(id: string, input: PositionInput) {
  await requireAdmin();
  const data = positionSchema.parse(input);
  await db
    .update(schema.rentalPositions)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(schema.rentalPositions.id, id));
  revalidateAll();
}

export async function deletePosition(id: string) {
  await requireAdmin();
  await db.delete(schema.rentalPositions).where(eq(schema.rentalPositions.id, id));
  revalidateAll();
}

/** Глобален превключвател „отдаваме ли място под наем". Управлява видимостта на /karieri. */
export async function setRentalOpen(open: boolean) {
  await requireAdmin();
  const exists = await db.query.siteSettings.findFirst({ where: (s, { eq }) => eq(s.key, "rental_open") });
  if (exists) {
    await db
      .update(schema.siteSettings)
      .set({ value: open, updatedAt: new Date() })
      .where(eq(schema.siteSettings.key, "rental_open"));
  } else {
    await db.insert(schema.siteSettings).values({ key: "rental_open", value: open, updatedAt: new Date() });
  }
  revalidateAll();
}
