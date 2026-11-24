import type { Metadata } from "next";
import { db } from "@/lib/db";
import { listPublicGalleryImages } from "@/lib/data/public-gallery";
import { publicPricesByItem } from "@/lib/data/service-catalog";
import { KIND_BY_SLUG } from "@/lib/booking/kind";
import { getClosedDates } from "@/lib/booking/closures";
import { getReadiness, isReady } from "@/lib/booking/readiness";
import { adminResourceUserIds, getConsentMap } from "@/lib/data/tenant-consent";
import { publicIdentity } from "@/lib/data/tenant-identity";
import {
  PublicBookingForm,
  type PublicServiceOpt,
  type PerformerOpt,
} from "@/components/forms/public-booking-form";

export const metadata: Metadata = {
  title: "Запази час",
  description: "Запази час онлайн в Euphoria Hair & Beauty Bar, кв. Левски, Варна. Избери услуга, изпълнител и свободен час.",
  alternates: { canonical: "/zapazi-chas" },
};

// Винаги динамична: услугите/изпълнителите/портфолиото идват live от базата
// (важно за актуални слотове) + премахва DB зависимостта от build-а.
export const dynamic = "force-dynamic";

export default async function BookingPage() {
  const [cats, items, activeResources, gallery, offerings] = await Promise.all([
    db.query.serviceCategories.findMany(),
    db.query.serviceItems.findMany({
      where: (s, { eq }) => eq(s.bookableOnline, true),
      orderBy: (s, { asc }) => [asc(s.sortOrder)],
    }),
    db.query.resources.findMany({
      where: (r, { eq }) => eq(r.active, true),
      orderBy: (r, { asc }) => [asc(r.sortOrder)],
    }),
    listPublicGalleryImages(),
    db.query.resourceServices.findMany({ where: (rs, { eq }) => eq(rs.active, true) }),
  ]);

  // Само готови изпълнители (поне една своя услуга): нов не излиза, преди да е готов.
  const readiness = await getReadiness(activeResources.map((r) => r.id));
  const resources = activeResources.filter((r) => isReady(readiness.get(r.id)));

  const [closed, adminIds, consent] = await Promise.all([getClosedDates(), adminResourceUserIds(), getConsentMap()]);
  const catById = new Map(cats.map((c) => [c.id, c]));

  // Портфолио снимки по изпълнител (само тагнатите към него)
  const portfolioByResource = new Map<string, { src: string; alt: string }[]>();
  for (const g of gallery) {
    if (!g.resourceId) continue;
    const arr = portfolioByResource.get(g.resourceId) ?? [];
    arr.push({ src: g.src, alt: g.alt });
    portfolioByResource.set(g.resourceId, arr);
  }

  // Собствени услуги/цени по изпълнител (resource_services). Изпълнител с поне
  // един запис е „curated" — предлага само отметнатите; иначе fallback по kind.
  const offeringsByResource = new Map<string, Record<string, { price: number; priceMax: number | null; priceFrom: boolean; currency: string; durationMin: number; bufferMin: number; onlineBookable: boolean }>>();
  for (const o of offerings) {
    const m = offeringsByResource.get(o.resourceId) ?? {};
    m[o.serviceItemId] = {
      price: o.price,
      priceMax: o.priceMax,
      priceFrom: o.priceFrom,
      currency: o.currency,
      durationMin: o.durationMin,
      bufferMin: o.bufferMin,
      onlineBookable: o.onlineBookable,
    };
    offeringsByResource.set(o.resourceId, m);
  }

  // Наемател (не е вързан към вход на админ): име и снимка само със съгласие, вместо описанието
  // честният ред «Самостоятелен специалист в салона» (визия №21). Името без съгласие не стига до браузъра.
  const performers: PerformerOpt[] = resources.map((r) => {
    const tenant = !(r.userId && adminIds.has(r.userId));
    return {
      id: r.id,
      ...publicIdentity({ name: r.name, image: r.image ?? null }, { tenant, consent: !!consent[r.id] }),
      tenant,
      kind: r.kind,
      bio: tenant ? null : (r.bio ?? null),
      // Личният телефон само със съгласие; без него карето «Обади се за час» звъни на салона (решение 21).
      phone: tenant && !consent[r.id] ? null : (r.phone ?? null),
      portfolio: portfolioByResource.get(r.id) ?? [],
      curated: offeringsByResource.has(r.id),
      offerings: offeringsByResource.get(r.id) ?? {},
    };
  });

  // Услугите НЕ се филтрират по наличен изпълнител: kind без активен изпълнител
  // (напр. маникюр между двама наематели) остава видим и формата го показва като
  // „· по телефон" (както козметика със спрян онлайн запис), вместо категорията
  // да изчезва мълчаливо, докато FAQ/CTA другаде обещават запис.
  // Цената преди избор на специалист е тази от ценоразписа (един източник с /uslugi).
  const listPrices = publicPricesByItem(items, cats, offerings, resources);
  const services: PublicServiceOpt[] = items.flatMap((i) => {
    const cat = catById.get(i.categoryId);
    const kind = cat ? KIND_BY_SLUG[cat.slug] : undefined;
    if (!kind) return [];
    return [
      {
        id: i.id,
        name: i.name,
        durationMin: i.durationMin,
        bufferMin: i.bufferMin,
        category: cat?.shortTitle ?? "",
        groupTitle: i.groupTitle,
        kind,
        price: i.price,
        priceMax: i.priceMax,
        priceFrom: i.priceFrom,
        currency: i.currency,
        listPrice: listPrices.get(i.id)!,
      },
    ];
  });

  return (
    <section className="bg-cream pt-8 pb-12 md:pt-32 md:pb-20 lg:pt-40">
      <div className="mx-auto max-w-2xl px-4 lg:px-8">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.25em] text-foreground/60">Запазване онлайн</p>
        <h1 className="font-display text-4xl font-medium md:text-5xl">Запази час</h1>
        <p className="mt-4 font-serif text-lg italic text-muted-foreground">
          {services.length > 0
            ? "Избери услуга, специалист и свободен час. Ще получиш потвърждение на имейла."
            : "В момента онлайн записването не е налично. Обади се или ни пиши във Viber."}
        </p>
        <p className="mt-3 mb-6 md:mb-8 text-sm text-muted-foreground">
          Плащането е в салона: в брой, с карта или през Revolut. Запазването е без депозит.
        </p>
        {services.length > 0 && <PublicBookingForm services={services} performers={performers} closedDates={closed} />}
      </div>
    </section>
  );
}
