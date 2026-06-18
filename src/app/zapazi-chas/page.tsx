import type { Metadata } from "next";
import { db } from "@/lib/db";
import { KIND_BY_SLUG } from "@/lib/booking/kind";
import { getClosedDates } from "@/lib/booking/closures";
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
  const [cats, items, resources, gallery, offerings] = await Promise.all([
    db.query.serviceCategories.findMany(),
    db.query.serviceItems.findMany({
      where: (s, { eq }) => eq(s.bookableOnline, true),
      orderBy: (s, { asc }) => [asc(s.sortOrder)],
    }),
    db.query.resources.findMany({
      where: (r, { eq }) => eq(r.active, true),
      orderBy: (r, { asc }) => [asc(r.sortOrder)],
    }),
    db.query.galleryImages.findMany({ orderBy: (g, { asc }) => [asc(g.sortOrder)] }),
    db.query.resourceServices.findMany({ where: (rs, { eq }) => eq(rs.active, true) }),
  ]);

  const closed = await getClosedDates();
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
  const offeringsByResource = new Map<string, Record<string, { price: number; priceMax: number | null; priceFrom: boolean; currency: string; durationMin: number; bufferMin: number }>>();
  for (const o of offerings) {
    const m = offeringsByResource.get(o.resourceId) ?? {};
    m[o.serviceItemId] = {
      price: o.price,
      priceMax: o.priceMax,
      priceFrom: o.priceFrom,
      currency: o.currency,
      durationMin: o.durationMin,
      bufferMin: o.bufferMin,
    };
    offeringsByResource.set(o.resourceId, m);
  }

  const kindsWithPerformer = new Set(resources.map((r) => r.kind));

  const performers: PerformerOpt[] = resources.map((r) => ({
    id: r.id,
    name: r.name,
    kind: r.kind,
    image: r.image ?? null,
    bio: r.bio ?? null,
    portfolio: portfolioByResource.get(r.id) ?? [],
    curated: offeringsByResource.has(r.id),
    offerings: offeringsByResource.get(r.id) ?? {},
  }));

  const services: PublicServiceOpt[] = items.flatMap((i) => {
    const cat = catById.get(i.categoryId);
    const kind = cat ? KIND_BY_SLUG[cat.slug] : undefined;
    if (!kind || !kindsWithPerformer.has(kind)) return [];
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
      },
    ];
  });

  return (
    <section className="bg-cream pt-32 pb-20 lg:pt-40">
      <div className="mx-auto max-w-2xl px-4 lg:px-8">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.25em] text-foreground/60">Запазване онлайн</p>
        <h1 className="font-display text-4xl font-medium md:text-5xl">Запази час</h1>
        <p className="mt-4 mb-8 font-serif text-lg italic text-muted-foreground">
          {services.length > 0
            ? "Избери услуга, изпълнител и свободен час. Ще получиш потвърждение на имейла."
            : "В момента онлайн записването не е налично. Обади се или ни пиши във Viber."}
        </p>
        {services.length > 0 && <PublicBookingForm services={services} performers={performers} closedDates={closed} />}
      </div>
    </section>
  );
}
