"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { requireAdmin } from "@/lib/actions/auth-guard";

const faqSchema = z.object({
  question: z.string().min(3),
  answer: z.string().min(10),
  active: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export type FaqInput = z.infer<typeof faqSchema>;

export async function createFaq(input: FaqInput) {
  await requireAdmin();
  const data = faqSchema.parse(input);
  await db.insert(schema.faqItems).values({ id: nanoid(), ...data });
  revalidatePath("/admin/faq");
  revalidatePath("/");
}

export async function updateFaq(id: string, input: FaqInput) {
  await requireAdmin();
  const data = faqSchema.parse(input);
  await db.update(schema.faqItems).set(data).where(eq(schema.faqItems.id, id));
  revalidatePath("/admin/faq");
  revalidatePath("/");
}

export async function deleteFaq(id: string) {
  await requireAdmin();
  await db.delete(schema.faqItems).where(eq(schema.faqItems.id, id));
  revalidatePath("/admin/faq");
  revalidatePath("/");
}
