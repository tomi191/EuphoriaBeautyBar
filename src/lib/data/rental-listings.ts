/**
 * Публичните четения на обявите за място под наем (/karieri, /karieri/<slug>, /za-nas).
 * Колоните се изброяват една по една и изходът се сглобява ръчно: admin_note, filled_by_resource_id
 * и полетата за Facebook НИКОГА не излизат оттук; сумата на наема излиза само при включен ключ
 * «показвай в обявата» (тест: rental-listings.test.ts).
 */
import { and, asc, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { benefitsFromKeys, type RentalBenefit } from "@/lib/rental/benefits";
import { effectiveStatus, type ListingStatus } from "@/lib/rental/listing-rules";

const rp = schema.rentalPositions;
const sc = schema.serviceCategories;

export interface PublicListing {
  id: string;
  /** null = стар ред отпреди обявите: няма своя страница. */
  slug: string | null;
  title: string;
  status: Extract<ListingStatus, "published" | "filled">;
  image: string | null;
  benefits: RentalBenefit[];
  /** null = стар ред или изтрита категория. */
  category: { id: string; slug: string; title: string; shortTitle: string } | null;
  services: { id: string; name: string; groupTitle: string }[];
  publishedAt: Date | null;
  /** Старите полета (стар ред): описанието и уменията, писани на ръка. */
  description: string;
  skills: string[];
  /** Наемът на месец в € («300»); null, когато ключът «показвай в обявата» е изключен или няма сума. */
  rent: string | null;
}

// Публикувана: новото състояние или стар ред без състояние, който е активен.
const isPublished = or(eq(rp.status, "published"), and(isNull(rp.status), eq(rp.active, true)));

const publicColumns = {
  id: rp.id,
  slug: rp.slug,
  title: rp.title,
  status: rp.status,
  active: rp.active,
  image: rp.image,
  benefits: rp.benefits,
  serviceIds: rp.serviceIds,
  publishedAt: rp.publishedAt,
  description: rp.description,
  skills: rp.skills,
  rentText: rp.rentText,
  rentPublic: rp.rentPublic,
  catId: sc.id,
  catSlug: sc.slug,
  catTitle: sc.title,
  catShortTitle: sc.shortTitle,
};

type Row = {
  id: string;
  slug: string | null;
  title: string;
  status: ListingStatus | null;
  active: boolean;
  image: string | null;
  benefits: string[] | null;
  serviceIds: string[] | null;
  publishedAt: Date | null;
  description: string;
  skills: string[] | null;
  rentText: string | null;
  rentPublic: boolean;
  catId: string | null;
  catSlug: string | null;
  catTitle: string | null;
  catShortTitle: string | null;
};

async function servicesById(rows: Row[]) {
  const ids = [...new Set(rows.flatMap((r) => r.serviceIds ?? []))];
  if (ids.length === 0) return new Map<string, { id: string; name: string; groupTitle: string }>();
  const items = await db
    .select({ id: schema.serviceItems.id, name: schema.serviceItems.name, groupTitle: schema.serviceItems.groupTitle })
    .from(schema.serviceItems)
    .where(inArray(schema.serviceItems.id, ids));
  return new Map(items.map((i) => [i.id, { id: i.id, name: i.name, groupTitle: i.groupTitle }]));
}

function toPublic(r: Row, services: Map<string, { id: string; name: string; groupTitle: string }>): PublicListing {
  const status = effectiveStatus({ status: r.status, active: r.active });
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    status: status === "filled" ? "filled" : "published",
    image: r.image,
    benefits: benefitsFromKeys(r.benefits ?? []),
    category:
      r.catId && r.catSlug && r.catTitle && r.catShortTitle
        ? { id: r.catId, slug: r.catSlug, title: r.catTitle, shortTitle: r.catShortTitle }
        : null,
    // В реда, в който са избрани; изтрита услуга отпада.
    services: (r.serviceIds ?? []).flatMap((id) => {
      const s = services.get(id);
      return s ? [s] : [];
    }),
    publishedAt: r.publishedAt,
    description: r.description,
    skills: r.skills ?? [],
    rent: r.rentPublic && r.rentText ? r.rentText : null,
  };
}

/** Отворените обяви (публикувани), подредени: ръчният ред, после най-новите. */
export async function getOpenListings(): Promise<PublicListing[]> {
  const rows: Row[] = await db
    .select(publicColumns)
    .from(rp)
    .leftJoin(sc, eq(rp.categoryId, sc.id))
    .where(isPublished)
    .orderBy(asc(rp.sortOrder), desc(rp.publishedAt), asc(rp.title));
  const services = await servicesById(rows);
  return rows.map((r) => toPublic(r, services));
}

/**
 * Една обява по адреса. Връща публикуваната и заетата (страницата казва «заето», а връзката от
 * Facebook не води в 404); черновата и спряната → null.
 */
export async function getListingBySlug(slug: string): Promise<PublicListing | null> {
  const rows: Row[] = await db
    .select(publicColumns)
    .from(rp)
    .leftJoin(sc, eq(rp.categoryId, sc.id))
    .where(and(eq(rp.slug, slug), or(eq(rp.status, "published"), eq(rp.status, "filled"))))
    .limit(1);
  if (rows.length === 0) return null;
  const services = await servicesById(rows);
  return toPublic(rows[0], services);
}

/** Има ли поне една публикувана обява (за /za-nas). */
export async function hasOpenListings(): Promise<boolean> {
  const rows = await db.select({ id: rp.id }).from(rp).where(isPublished).limit(1);
  return rows.length > 0;
}
