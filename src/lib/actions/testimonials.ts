"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { requireAdmin } from "@/lib/actions/auth-guard";

const testimonialSchema = z.object({
  name: z.string().min(2),
  service: z.string().min(2),
  rating: z.number().int().min(1).max(5),
  quote: z.string().min(10),
  initials: z.string().min(1).max(3),
  approved: z.boolean().default(true),
});

export type TestimonialInput = z.infer<typeof testimonialSchema>;

export async function createTestimonial(input: TestimonialInput) {
  await requireAdmin();
  const data = testimonialSchema.parse(input);
  await db.insert(schema.testimonials).values({
    id: nanoid(),
    ...data,
    source: "manual",
    sortOrder: 0,
    createdAt: new Date(),
  });
  revalidatePath("/admin/testimonials");
  revalidatePath("/");
}

export async function updateTestimonial(id: string, input: TestimonialInput) {
  await requireAdmin();
  const data = testimonialSchema.parse(input);
  await db.update(schema.testimonials).set(data).where(eq(schema.testimonials.id, id));
  revalidatePath("/admin/testimonials");
  revalidatePath("/");
}

export async function deleteTestimonial(id: string) {
  await requireAdmin();
  await db.delete(schema.testimonials).where(eq(schema.testimonials.id, id));
  revalidatePath("/admin/testimonials");
  revalidatePath("/");
}
