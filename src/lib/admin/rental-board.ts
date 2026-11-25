/**
 * Данните за «Места под наем» в администрацията (визия №19): обявите със състоянието, броя на
 * запитванията и кой е заел мястото, изпълнителите за листа «Кой зае мястото?» и запитванията.
 * Само за администратор: всяко четене минава през requireAdmin (страницата е и под layout-а с роля).
 */
import { count } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireAdmin } from "@/lib/actions/auth-guard";
import { listRentalInquiries } from "@/lib/actions/rental-inquiries";
import { sofiaDateStr, sofiaTimeLabel } from "@/lib/booking/time";
import { isEnded } from "@/lib/booking/ended";
import { effectiveStatus, listingPosition, type ListingStatus } from "@/lib/rental/listing-rules";
import { formatBgPhone } from "@/lib/rental/inquiry-rules";
import { KIND_BY_SLUG } from "@/lib/booking/kind";

export interface BoardListing {
  id: string;
  /** «Маникюрист» (от категорията); стар ред без категория: заглавието му. */
  place: string;
  /** Видът изпълнител за мястото (hair, nails, cosmetics): в листа «Кой зае мястото?» тези са първи. */
  kind: string | null;
  slug: string | null;
  image: string | null;
  status: ListingStatus;
  /** «Публикувана на 12.11», «Спряна на 18.11», «Чернова от 20.11». */
  dateLabel: string;
  inquiries: number;
  rentPublic: boolean;
  fbPostUrl: string | null;
  /** Заета: кой е заел мястото. Спряна след «Приключи сътрудничеството»: кой е бил там. */
  filledBy: { id: string; firstName: string } | null;
}

export interface BoardResource {
  id: string;
  name: string;
  kind: string;
  kindLabel: string;
}

export interface BoardInquiry {
  id: string;
  positionId: string;
  place: string;
  name: string;
  phone: string;
  phoneLabel: string;
  specialty: string | null;
  message: string | null;
  status: "new" | "handled";
  /** «днес, 10:24», «вчера, 18:05», «20.11, 14:30». */
  whenLabel: string;
  handledLabel: string | null;
  /** Известието не стигна до нито един получател (няма свързан Telegram или всички опити паднаха). */
  undelivered: boolean;
}

const KIND_LABEL: Record<string, string> = { hair: "Коса", nails: "Маникюр", cosmetics: "Козметика" };

const dm = new Intl.DateTimeFormat("bg-BG", { timeZone: "Europe/Sofia", day: "2-digit", month: "2-digit" });
const dayMonth = (d: Date) => dm.format(d).replace(/\s*г\.?$/, "");

function capitalize(s: string) {
  return s.charAt(0).toLocaleUpperCase("bg-BG") + s.slice(1);
}

function dateLabel(status: ListingStatus, row: { publishedAt: Date | null; updatedAt: Date; createdAt: Date }) {
  if (status === "draft") return `Чернова от ${dayMonth(row.createdAt)}`;
  if (status === "paused") return `Спряна на ${dayMonth(row.updatedAt)}`;
  return `Публикувана на ${dayMonth(row.publishedAt ?? row.createdAt)}`;
}

export function whenLabel(at: Date, now = new Date()): string {
  const day = sofiaDateStr(at);
  const time = sofiaTimeLabel(at);
  if (day === sofiaDateStr(now)) return `днес, ${time}`;
  if (day === sofiaDateStr(new Date(now.getTime() - 24 * 60 * 60 * 1000))) return `вчера, ${time}`;
  return `${dayMonth(at)}, ${time}`;
}

export async function loadRentalBoard() {
  await requireAdmin();
  const ri = schema.rentalInquiries;
  const [rows, categories, resources, counts, inquiries, items] = await Promise.all([
    db.query.rentalPositions.findMany({ orderBy: (p, { desc }) => [desc(p.updatedAt)] }),
    db.query.serviceCategories.findMany({ columns: { id: true, slug: true } }),
    db.query.resources.findMany({ orderBy: (r, { asc }) => [asc(r.sortOrder), asc(r.name)] }),
    db.select({ positionId: ri.positionId, n: count() }).from(ri).groupBy(ri.positionId),
    listRentalInquiries(),
    db.query.serviceItems.findMany({ columns: { id: true, groupTitle: true } }),
  ]);
  const groupOf = new Map(items.map((s) => [s.id, s.groupTitle]));
  const catSlug = new Map(categories.map((c) => [c.id, c.slug]));
  const resName = new Map(resources.map((r) => [r.id, r.name]));
  const countBy = new Map(counts.map((c) => [c.positionId, Number(c.n)]));

  const listings: BoardListing[] = rows.map((row) => {
    const status = effectiveStatus(row);
    const slug = row.categoryId ? catSlug.get(row.categoryId) : undefined;
    const filledName = row.filledByResourceId ? resName.get(row.filledByResourceId) : undefined;
    return {
      id: row.id,
      // Обява само с грим: «Гримьор».
      place: slug
        ? capitalize(listingPosition(slug, (row.serviceIds ?? []).flatMap((id) => groupOf.get(id) ?? [])))
        : row.title,
      kind: slug ? (KIND_BY_SLUG[slug] ?? null) : null,
      slug: row.slug,
      image: row.image,
      status,
      dateLabel: dateLabel(status, row),
      inquiries: countBy.get(row.id) ?? 0,
      rentPublic: row.rentPublic,
      fbPostUrl: row.fbPostId ? `https://www.facebook.com/${row.fbPostId}` : null,
      filledBy:
        row.filledByResourceId && filledName && (status === "filled" || status === "paused")
          ? { id: row.filledByResourceId, firstName: filledName.trim().split(/\s+/)[0] }
          : null,
    };
  });
  const placeBy = new Map(listings.map((l) => [l.id, l.place]));

  const now = new Date();
  const boardInquiries: BoardInquiry[] = inquiries.map((i) => ({
    id: i.id,
    positionId: i.positionId,
    place: placeBy.get(i.positionId) ?? i.positionTitle,
    name: i.name,
    phone: i.phone,
    phoneLabel: formatBgPhone(i.phone),
    specialty: i.specialty,
    message: i.message,
    status: i.status,
    whenLabel: whenLabel(i.createdAt, now),
    handledLabel: i.handledAt ? `Обработено на ${dayMonth(i.handledAt)}` : null,
    undelivered: i.notifyDelivered === false,
  }));

  // В листа: само изпълнителите, които работят (приключилите и скритите не заемат място).
  const pickable: BoardResource[] = resources
    .filter((r) => r.active && !isEnded(r))
    .map((r) => ({ id: r.id, name: r.name, kind: r.kind, kindLabel: KIND_LABEL[r.kind] ?? r.kind }));

  return { listings, resources: pickable, inquiries: boardInquiries };
}
