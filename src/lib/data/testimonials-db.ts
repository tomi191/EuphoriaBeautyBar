import { db } from "@/lib/db";
import type { Testimonial } from "@/lib/data/testimonials";

export type PublicTestimonial = Testimonial & { source: string };

/**
 * Само одобрените отзиви от /admin/testimonials. БЕЗ fallback към статичния
 * testimonials.ts: той е примерни (seed) данни, а празна БД трябва да не
 * показва нищо, вместо измислени клиенти.
 */
export async function getTestimonials(): Promise<PublicTestimonial[]> {
  try {
    const rows = await db.query.testimonials.findMany({
      where: (t, { eq }) => eq(t.approved, true),
      orderBy: (t, { asc }) => [asc(t.sortOrder), asc(t.createdAt)],
    });
    return rows.map(({ name, service, rating, quote, initials, source }) => ({
      name,
      service,
      rating,
      quote,
      initials,
      source,
    }));
  } catch {
    return [];
  }
}
