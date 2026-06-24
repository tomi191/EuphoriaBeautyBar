import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Calendar, ChevronRight, Phone } from "lucide-react";
import { PricingTable } from "@/components/service/pricing-table";
import { Reveal } from "@/components/reactbits/reveal";
import { BlurText } from "@/components/reactbits/blur-text";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { getServiceCatalog, getCatalogCategory } from "@/lib/data/service-catalog";
import { siteConfig } from "@/lib/site";
import { breadcrumbSchema, serviceSchema } from "@/lib/schema";
import { slugify } from "@/lib/utils";

interface ServiceDetailParams {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const cats = await getServiceCatalog();
  return cats.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: ServiceDetailParams): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCatalogCategory(slug);
  if (!category) return { robots: { index: false } };
  return {
    // metaTitle носи „Варна, кв. Левски" (template добавя " · Euphoria"); fallback към seoTitle.
    title: category.metaTitle ?? category.seoTitle,
    description: category.metaDescription ?? category.description,
    alternates: { canonical: `/uslugi/${category.slug}` },
    openGraph: {
      title: category.seoTitle,
      description: category.metaDescription ?? category.description,
      images: [category.heroImage],
    },
  };
}

export default async function ServiceDetailPage({ params }: ServiceDetailParams) {
  const { slug } = await params;
  const allCategories = await getServiceCatalog();
  const category = allCategories.find((c) => c.slug === slug);
  if (!category) notFound();

  const otherCategories = allCategories.filter((c) => c.slug !== category.slug);

  // Прави anchor IDs за всяка група
  const groupSections = category.groups.map((g) => ({
    id: `g-${slugify(g.title)}`,
    label: g.title,
    items: g.items,
  }));

  const prices = category.groups.flatMap((g) => g.items.map((i) => i.price));
  const lowPrice = Math.min(...prices);
  const highPrice = Math.max(...prices);
  const priceCurrency = category.groups[0]?.items[0]?.currency === "€" ? "EUR" : "BGN";

  return (
    <>
      {/* HERO — реалната снимка на услугата във фон + топъл воал (като началната страница) */}
      <section id="info" className="relative isolate min-h-[70svh] overflow-hidden bg-cream lg:min-h-[76svh]">
        {/* Фон — реалната снимка на услугата */}
        <Image
          src={category.heroImage}
          alt={`${category.title} в Euphoria, кв. Левски, Варна`}
          fill
          priority
          fetchPriority="high"
          quality={75}
          sizes="100vw"
          className="-z-20 object-cover object-center"
        />
        {/* Топъл воал — четим текст отляво, снимката се отваря отдясно */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/85 to-background/45 lg:bg-gradient-to-r lg:from-background lg:via-background/80 lg:to-transparent"
        />

        <div className="relative z-10 mx-auto flex min-h-[70svh] max-w-7xl flex-col px-4 pt-28 pb-12 lg:min-h-[76svh] lg:px-10 lg:pt-32">
          <nav aria-label="Трохи" className="flex flex-wrap items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            <Link href="/" className="hover:text-foreground">Начало</Link>
            <ChevronRight className="size-3" />
            <Link href="/uslugi" className="hover:text-foreground">Услуги</Link>
            <ChevronRight className="size-3" />
            <span className="text-foreground">{category.title}</span>
          </nav>

          <div className="flex flex-1 items-center">
            <div className="max-w-2xl">
              <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.25em] text-foreground/60">
                {category.shortTitle} · кв. Левски, Варна
              </p>
              <BlurText
                as="h1"
                text={category.seoTitle}
                className="font-display text-4xl leading-[1.05] font-medium text-balance md:text-5xl lg:text-6xl"
                stagger={0.025}
              />
              <p className="mt-6 max-w-xl font-serif text-xl italic text-foreground/80">
                {category.tagline}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg" className="h-12 rounded-full bg-foreground px-8 text-background hover:bg-primary">
                  <Link href="/zapazi-chas">
                    <Calendar className="size-4" /> Запиши час
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 rounded-full border-foreground/30 bg-background/60 px-8 backdrop-blur">
                  <a href={`tel:${siteConfig.contact.phone}`}>
                    <Phone className="size-4" /> {siteConfig.contact.phoneFormatted}
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* OPISANIE / longDescription */}
      <section className="border-y border-border/40 bg-secondary/40 py-16 lg:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center lg:px-8">
          <Reveal>
            <p className="font-serif text-xl leading-relaxed italic text-foreground/85 md:text-2xl">
              &ldquo;{category.longDescription}&rdquo;
            </p>
          </Reveal>
        </div>
      </section>

      {/* PRICING — групирано с H2 anchors */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-4xl px-4 lg:px-8">
          <Reveal>
            <header className="mb-14 text-center">
              <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.25em] text-foreground/60">
                Прозрачни цени · {category.shortTitle} · Варна
              </p>
              <p className="font-display text-3xl font-medium md:text-4xl">
                Ценоразпис на {category.title}
              </p>
            </header>
          </Reveal>

          <div className="space-y-20">
            {groupSections.map((group, gi) => (
              <Reveal key={group.id} delay={gi * 0.05}>
                <section id={group.id} className="scroll-mt-24">
                  <header className="mb-6 flex items-baseline justify-between border-b border-border/60 pb-3">
                    <h2 className="font-display text-2xl font-medium md:text-3xl">{group.label}</h2>
                    <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                      {group.items.length} услуги
                    </span>
                  </header>
                  <PricingTable groups={[{ title: group.label, items: [...group.items] }]} hideHeader />
                </section>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CROSS-LINKS — другите 3 категории (както live сайта) */}
      <section id="drugi" className="scroll-mt-24 border-t border-border/40 bg-cream py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 lg:px-10">
          <Reveal>
            <div className="mb-10 grid items-end gap-4 md:grid-cols-2">
              <div>
                <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.25em] text-foreground/60">
                  Други услуги
                </p>
                <h2 className="font-display text-4xl font-medium md:text-5xl">
                  Виж и <em className="font-serif italic text-primary">останалите</em>.
                </h2>
              </div>
              <p className="font-serif text-lg italic text-muted-foreground">
                Често комбинираме услуги — кератин + балаяж, маникюр + педикюр, лицева терапия + ламиниране.
              </p>
            </div>
          </Reveal>

          <div className="grid gap-4 md:grid-cols-3">
            {otherCategories.map((c, idx) => (
              <Reveal key={c.slug} delay={idx * 0.06}>
                <Link
                  href={`/uslugi/${c.slug}`}
                  className="group block overflow-hidden rounded-md border border-foreground/10 bg-background transition-colors hover:border-foreground/30"
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <Image
                      src={c.heroImage}
                      alt={c.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-5">
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/70">
                      {c.shortTitle}
                    </p>
                    <h3 className="mt-2 font-display text-xl">{c.title}</h3>
                    <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
                      Виж услугите{" "}
                      <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="kontakt" className="scroll-mt-24 bg-foreground py-20 text-background">
        <div className="mx-auto max-w-3xl px-4 text-center lg:px-8">
          <h2 className="font-display text-4xl font-medium md:text-5xl">
            Готова да опиташ <em className="font-serif italic text-mint">{category.shortTitle.toLowerCase()}</em>?
          </h2>
          <p className="mt-4 text-background/70">
            Запиши се за час по телефон, Viber или през онлайн формата ни — отговаряме лично.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="h-12 rounded-md bg-mint px-8 text-foreground hover:bg-mint/80">
              <Link href="/zapazi-chas">
                <Calendar className="size-4" /> Запиши час
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 rounded-md border-background/30 bg-transparent px-8 text-background hover:bg-background/10">
              <a href={`tel:${siteConfig.contact.phone}`}>
                <Phone className="size-4" /> {siteConfig.contact.phoneFormatted}
              </a>
            </Button>
          </div>
        </div>
      </section>

      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "Начало", url: siteConfig.url },
            { name: "Услуги", url: `${siteConfig.url}/uslugi` },
            { name: category.title, url: `${siteConfig.url}/uslugi/${category.slug}` },
          ]),
          serviceSchema({
            name: category.title,
            description: category.description,
            url: `${siteConfig.url}/uslugi/${category.slug}`,
            category: category.shortTitle,
            offers: { lowPrice, highPrice, priceCurrency },
          }),
        ]}
      />
    </>
  );
}
