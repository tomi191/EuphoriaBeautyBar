import { inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getReadiness, isReady } from "@/lib/booking/readiness";
import { getConsentMap } from "@/lib/data/tenant-consent";
import { KIND_BY_SLUG } from "@/lib/booking/kind";
import { sofiaOffsetMinutes, sofiaWallToUtc } from "@/lib/booking/time";
import { SERVICE_CONTENT } from "@/lib/data/service-content";
import { siteConfig } from "@/lib/site";
import { slugify } from "@/lib/utils";
import { loadCampaignViews, type CampaignView } from "@/lib/campaigns/core";
import type { CampaignCardData } from "@/components/campaigns/campaign-card";

// Публичните места на промоциите (№11, част 2): началната, /promotsii, категорията и услугата.
// Само одобрени, които текат днес (campaignPhase === "running") и имат свободни места. Цената е от
// същия ред като в приложението и в администрацията (campaign_services), затова картата и schema
// не се разминават.

/** Позициите на /promotsii (кадър промоции-1440/390). */
export const KIND_HEADING: Record<string, string> = { hair: "Коса", nails: "Нокти", cosmetics: "Козметика" };
const KIND_ORDER = ["hair", "nails", "cosmetics"];

export type PublicService = CampaignView["services"][number] & {
  categorySlug: string;
  /** Страницата на услугата, ако я има (SERVICE_CONTENT). */
  serviceHref: string | null;
};

export type PublicCampaign = {
  id: string;
  kind: CampaignView["kind"];
  resourceId: string;
  resourceKind: string;
  startsOn: string;
  endsOn: string;
  card: CampaignCardData;
  services: PublicService[];
  /** Записва ли се онлайн (готов специалист и онлайн запис за всички услуги); иначе по телефона. */
  online: boolean;
  /** Бутонът на картата: записът с избрани услуга и специалист, или обаждане. */
  action: { href: string; phone: boolean };
};

/** Телефонът за обаждане: личният само със съгласие (решение 21), иначе салонът. */
function phoneHref(phone: string | null, consent: boolean, isOwner: boolean) {
  const p = (consent || isOwner) && phone ? phone.replace(/[^\d+]/g, "") : siteConfig.contact.phone;
  return `tel:${p}`;
}

/** Течащите промоции, подредени по края (първо тези, които свършват най-скоро). */
export async function loadRunningCampaigns(): Promise<PublicCampaign[]> {
  const views = (await loadCampaignViews({})).filter(
    (v) => v.phase === "running" && (v.slots == null || v.slots - v.stats.total > 0),
  );
  if (views.length === 0) return [];
  const resourceIds = [...new Set(views.map((v) => v.resourceId))];
  const itemIds = [...new Set(views.flatMap((v) => v.services.map((s) => s.serviceItemId)))];
  const [resources, items, cats, offers, readiness, consent] = await Promise.all([
    db.query.resources.findMany({ where: (r) => inArray(r.id, resourceIds) }),
    db.query.serviceItems.findMany({ where: (i) => inArray(i.id, itemIds) }),
    db.query.serviceCategories.findMany(),
    db
      .select()
      .from(schema.resourceServices)
      .where(inArray(schema.resourceServices.resourceId, resourceIds)),
    getReadiness(resourceIds),
    getConsentMap(),
  ]);
  const resById = new Map(resources.map((r) => [r.id, r]));
  const itemById = new Map(items.map((i) => [i.id, i]));
  const catSlug = new Map(cats.map((c) => [c.id, c.slug]));

  const out: PublicCampaign[] = [];
  for (const v of views) {
    const r = resById.get(v.resourceId);
    if (!r || !r.active) continue;
    const services: PublicService[] = v.services.map((s) => {
      const item = itemById.get(s.serviceItemId);
      const slug = (item && catSlug.get(item.categoryId)) ?? "";
      const svc = slugify(s.name);
      return { ...s, categorySlug: slug, serviceHref: slug && SERVICE_CONTENT[svc] ? `/uslugi/${slug}/${svc}` : null };
    });
    const online =
      isReady(readiness.get(r.id)) &&
      v.services.every((s) => {
        const item = itemById.get(s.serviceItemId);
        const rs = offers.find((o) => o.serviceItemId === s.serviceItemId && o.resourceId === r.id);
        return !!item?.bookableOnline && !!rs?.active && rs.onlineBookable && KIND_BY_SLUG[catSlug.get(item.categoryId) ?? ""] === r.kind;
      });
    const first = v.services[0];
    const params = new URLSearchParams({ promo: v.id, specialist: r.id, ...(first ? { usluga: first.serviceItemId } : {}) });
    out.push({
      id: v.id,
      kind: v.kind,
      resourceId: r.id,
      resourceKind: r.kind,
      startsOn: v.startsOn,
      endsOn: v.endsOn,
      services,
      online,
      action: online
        ? { href: `/zapazi-chas?${params.toString()}`, phone: false }
        : { href: phoneHref(r.phone ?? null, !!consent[r.id], v.isOwner), phone: true },
      card: {
        kind: v.kind,
        who: v.who,
        services: v.services.map((s) => ({
          name: s.name,
          prevEur: s.prevEur,
          newEur: s.newEur,
          percent: s.percent,
          regularEur: s.regularEur,
          priceFrom: s.priceFrom,
        })),
        gift: v.gift,
        reason: v.reason,
        endsOn: v.endsOn,
        firstVisitOnly: v.firstVisitOnly,
        slotsLeft: v.slots == null ? null : v.slots - v.stats.total,
        sameWho: v.isOwner ? v.who.replace(/^при /, "") : "този специалист",
      },
    });
  }
  return out.sort((a, b) => a.endsOn.localeCompare(b.endsOn) || a.startsOn.localeCompare(b.startsOn));
}

/** За началната: по една на специалист (първо тази, която свършва най-скоро), най-много 3. */
export function homePicks(all: PublicCampaign[]): PublicCampaign[] {
  const seen = new Set<string>();
  const out: PublicCampaign[] = [];
  for (const c of all) {
    if (seen.has(c.resourceId)) continue;
    seen.add(c.resourceId);
    out.push(c);
    if (out.length === 3) break;
  }
  return out;
}

/** За /promotsii: по позиции (коса, нокти, козметика), във всяка по края. */
export function byPosition(all: PublicCampaign[]): { kind: string; heading: string; items: PublicCampaign[] }[] {
  return KIND_ORDER.map((kind) => ({ kind, heading: KIND_HEADING[kind], items: all.filter((c) => c.resourceKind === kind) })).filter(
    (g) => g.items.length > 0,
  );
}

/** Промоция по id за стара връзка (пост във Facebook): свършила или спряна → «приключи на …» с редовната цена. */
export async function loadEndedCampaign(id: string): Promise<{
  endedOn: string;
  serviceName: string;
  regular: { eur: number; from: boolean } | null;
  serviceHref: string;
} | null> {
  const v = (await loadCampaignViews({})).find((x) => x.id === id);
  if (!v || (v.phase !== "ended" && v.phase !== "stopped")) return null;
  const s = v.services[0];
  if (!s) return null;
  const [item, rs] = await Promise.all([
    db.query.serviceItems.findFirst({ where: (i, { eq }) => eq(i.id, s.serviceItemId) }),
    db.query.resourceServices.findFirst({
      where: (o, { and, eq }) => and(eq(o.resourceId, v.resourceId), eq(o.serviceItemId, s.serviceItemId), eq(o.active, true)),
    }),
  ]);
  const cat = item ? await db.query.serviceCategories.findFirst({ where: (c, { eq }) => eq(c.id, item.categoryId) }) : undefined;
  const svc = slugify(s.name);
  // Цената се чете живо (Саиф 1.17): своята цена на специалиста, иначе ценоразписът.
  const price = rs ?? item;
  return {
    endedOn: v.phase === "stopped" ? (v.stoppedOn ?? v.endsOn) : v.endsOn,
    serviceName: s.name,
    regular: price ? { eur: price.price, from: price.priceFrom } : null,
    serviceHref: cat ? (SERVICE_CONTENT[svc] ? `/uslugi/${cat.slug}/${svc}` : `/uslugi/${cat.slug}`) : "/uslugi",
  };
}

/** ISO 8601 с отместването на София (schema: validFrom / validThrough). */
export function sofiaIso(date: string, time: string): string {
  const at = sofiaWallToUtc(date, time.slice(0, 5));
  const off = sofiaOffsetMinutes(at);
  const sign = off >= 0 ? "+" : "-";
  const hh = String(Math.floor(Math.abs(off) / 60)).padStart(2, "0");
  const mm = String(Math.abs(off) % 60).padStart(2, "0");
  return `${date}T${time}${sign}${hh}:${mm}`;
}

/** Offer само за течаща промоция (само на /promotsii), с цената от същия ред като видимата. */
export function campaignOffersLd(all: PublicCampaign[]): Record<string, unknown>[] {
  return all.flatMap((c) =>
    c.services.flatMap((s) => {
      const fixed = !s.priceFrom;
      const price = c.kind === "discount" ? s.newEur : fixed ? s.regularEur : null;
      if (price == null) return [];
      return [
        {
          "@context": "https://schema.org",
          "@type": "Offer",
          name: c.kind === "discount" ? `${s.name}, ${c.card.who}` : `${s.name}, ${c.card.who}. Подарък в същия час: ${c.card.gift ?? ""}`,
          price: price.toFixed(2),
          priceCurrency: "EUR",
          validFrom: sofiaIso(c.startsOn, "00:00:00"),
          validThrough: sofiaIso(c.endsOn, "23:59:59"),
          availability: "https://schema.org/InStock",
          url: `${siteConfig.url}/promotsii`,
          seller: { "@type": "BeautySalon", "@id": siteConfig.url, name: siteConfig.name },
          itemOffered: {
            "@type": "Service",
            name: s.name,
            provider: { "@type": "BeautySalon", "@id": siteConfig.url },
            ...(s.serviceHref ? { url: `${siteConfig.url}${s.serviceHref}` } : {}),
          },
        },
      ];
    }),
  );
}
