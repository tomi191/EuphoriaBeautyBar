import { db } from "@/lib/db";
import { getReadiness, isReady } from "@/lib/booking/readiness";
import { adminResourceUserIds, getConsentMap } from "@/lib/data/tenant-consent";
import { publicIdentity } from "@/lib/data/tenant-identity";

export interface TenantCard {
  id: string;
  kind: string;
  /** Първо име; null = без писмено съгласие (картата казва само с какво се занимава). */
  name: string | null;
  image: string | null;
  /** Приема ли поне една услуга онлайн (иначе бутонът е «Обади се за час»). */
  online: boolean;
  portfolio: { src: string; alt: string }[];
}

/**
 * Картите в «За нас»: активни и готови изпълнители, които не са Снежана. «Скрит» и «Приключил»
 * (active=false) не излизат. Име и снимка само със съгласие (tenant-consent.ts).
 */
export async function getTenantCards(): Promise<TenantCard[]> {
  const [active, adminIds, consent] = await Promise.all([
    db.query.resources.findMany({
      where: (r, { eq }) => eq(r.active, true),
      orderBy: (r, { asc }) => [asc(r.sortOrder), asc(r.name)],
    }),
    adminResourceUserIds(),
    getConsentMap(),
  ]);
  const tenants = active.filter((r) => !(r.userId && adminIds.has(r.userId)));
  if (tenants.length === 0) return [];
  const ids = tenants.map((r) => r.id);
  const [readiness, offers, gallery] = await Promise.all([
    getReadiness(ids),
    db.query.resourceServices.findMany({
      where: (rs, { and, eq, inArray }) => and(eq(rs.active, true), inArray(rs.resourceId, ids)),
      columns: { resourceId: true, onlineBookable: true },
    }),
    db.query.galleryImages.findMany({
      where: (g, { inArray }) => inArray(g.resourceId, ids),
      orderBy: (g, { asc }) => [asc(g.sortOrder)],
      columns: { src: true, alt: true, resourceId: true },
    }),
  ]);
  const online = new Set(offers.filter((o) => o.onlineBookable).map((o) => o.resourceId));
  return tenants
    .filter((r) => isReady(readiness.get(r.id)))
    .map((r) => ({
      id: r.id,
      kind: r.kind,
      ...publicIdentity(r, { tenant: true, consent: !!consent[r.id] }),
      online: online.has(r.id),
      portfolio: gallery.filter((g) => g.resourceId === r.id).map((g) => ({ src: g.src, alt: g.alt })),
    }));
}
