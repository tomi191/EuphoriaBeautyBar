/**
 * Данните за формата «Нова обява» в администрацията (визия №12): категориите на салона с онлайн
 * услугите им, готовите предимства (оценката от Google е живата) и самата обява с бележката и наема.
 * Само за страниците в /admin (зад проверката за администратор).
 */
import { db } from "@/lib/db";
import { withLiveRating } from "@/lib/data/rental-listings";
import { RENTAL_BENEFITS } from "@/lib/rental/benefits";
import { effectiveStatus, type ListingStatus } from "@/lib/rental/listing-rules";

export interface FormCategory {
  id: string;
  slug: string;
  title: string;
  services: { id: string; name: string; groupTitle: string }[];
}

export interface FormListing {
  id: string;
  status: ListingStatus;
  slug: string | null;
  title: string;
  categoryId: string | null;
  serviceIds: string[];
  benefits: string[];
  customBenefits: string[];
  image: string | null;
  rentText: string;
  rentPublic: boolean;
  rentExcludes: string;
  seats: number;
  adminNote: string;
}

/** Категориите с поне една онлайн услуга (и тази на обявата, ако е без услуги), в реда на сайта. */
export async function loadFormCategories(keepId?: string | null): Promise<FormCategory[]> {
  const [categories, items] = await Promise.all([
    db.query.serviceCategories.findMany({
      orderBy: (c, { asc }) => [asc(c.sortOrder), asc(c.title)],
      columns: { id: true, slug: true, title: true },
    }),
    db.query.serviceItems.findMany({
      where: (s, { eq }) => eq(s.bookableOnline, true),
      orderBy: (s, { asc }) => [asc(s.sortOrder), asc(s.name)],
      columns: { id: true, name: true, groupTitle: true, categoryId: true },
    }),
  ]);
  return categories
    .map((c) => ({ ...c, services: items.filter((i) => i.categoryId === c.id).map(({ id, name, groupTitle }) => ({ id, name, groupTitle })) }))
    .filter((c) => c.services.length > 0 || c.id === keepId);
}

/** Готовите предимства с живата оценка от Google. */
export function loadFormBenefits() {
  return withLiveRating(RENTAL_BENEFITS.map((b) => ({ key: b.key, left: b.left, right: b.right })));
}

export async function loadFormListing(id: string): Promise<FormListing | null> {
  const row = await db.query.rentalPositions.findFirst({ where: (p, { eq }) => eq(p.id, id) });
  if (!row) return null;
  return {
    id: row.id,
    status: effectiveStatus(row),
    slug: row.slug,
    title: row.title,
    categoryId: row.categoryId,
    serviceIds: row.serviceIds ?? [],
    benefits: row.benefits ?? [],
    customBenefits: row.customBenefits ?? [],
    image: row.image,
    rentText: row.rentText ?? "",
    rentPublic: row.rentPublic,
    rentExcludes: row.rentExcludes ?? "",
    seats: row.seats,
    adminNote: row.adminNote ?? "",
  };
}
