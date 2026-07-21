import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, Phone, ChevronRight, Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { Reveal } from "@/components/reactbits/reveal";
import { BlurText } from "@/components/reactbits/blur-text";
import { getServiceCatalog, getServiceDetail } from "@/lib/data/service-catalog";
import { siteConfig } from "@/lib/site";
import { breadcrumbSchema, faqSchema } from "@/lib/schema";
import { slugify } from "@/lib/utils";
import { SERVICE_CONTENT } from "@/lib/data/service-content";

interface Params {
  params: Promise<{ slug: string; service: string }>;
}

export async function generateStaticParams() {
  // DB може да е недостъпна на build-time (напр. Vercel preview build без
  // DATABASE_URL) → не чупим build-а, рендираме on-demand вместо това.
  try {
    const cats = await getServiceCatalog();
    const out: { slug: string; service: string }[] = [];
    for (const c of cats) {
      for (const g of c.groups) {
        for (const i of g.items) {
          const s = slugify(i.name);
          if (SERVICE_CONTENT[s]) out.push({ slug: c.slug, service: s });
        }
      }
    }
    return out;
  } catch {
    return [];
  }
}

// On-demand за URL-и извън прегенерираните (вкл. когато build няма DB). Невалидни
// услуги → notFound() в самата страница (SERVICE_CONTENT + getServiceDetail guard).
export const dynamicParams = true;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug, service } = await params;
  const content = SERVICE_CONTENT[service];
  const detail = await getServiceDetail(slug, service);
  if (!content || !detail) return { robots: { index: false } };
  return {
    title: content.metaTitle,
    description: content.metaDescription,
    alternates: { canonical: `/uslugi/${slug}/${service}` },
    openGraph: {
      title: content.metaTitle,
      description: content.metaDescription,
      images: [`/images/services/unique/${service}.webp`],
    },
  };
}

export default async function ServiceDetailPage({ params }: Params) {
  const { slug, service } = await params;
  const content = SERVICE_CONTENT[service];
  const detail = await getServiceDetail(slug, service);
  if (!content || !detail) notFound();

  const { category, item, siblings } = detail;
  const img = `/images/services/unique/${service}.webp`;
  const url = `${siteConfig.url}/uslugi/${slug}/${service}`;
  const priceCurrency = item.currency === "€" ? "EUR" : "BGN";
  const priceLabel = `${item.priceFrom ? "от " : ""}${item.price} ${item.currency}`;

  // Service schema — Offer (единична цена), provider чрез @id референция (E-E-A-T консолидация).
  const serviceLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${url}#service`,
    serviceType: item.name,
    name: content.metaTitle.split(" —")[0],
    description: content.metaDescription,
    url,
    provider: { "@type": "BeautySalon", "@id": siteConfig.url, name: siteConfig.name },
    areaServed: [
      { "@type": "City", name: "Варна" },
      { "@type": "AdministrativeArea", name: "Варненска област" },
    ],
    offers: {
      "@type": "Offer",
      price: item.price.toFixed(2),
      priceCurrency,
      availability: "https://schema.org/InStock",
      url: `${siteConfig.url}/zapazi-chas`,
    },
  };
  const breadcrumbLd = breadcrumbSchema([
    { name: "Начало", url: siteConfig.url },
    { name: "Услуги", url: `${siteConfig.url}/uslugi` },
    { name: category.title, url: `${siteConfig.url}/uslugi/${slug}` },
    { name: item.name, url },
  ]);
  const faqLd = faqSchema(content.faq.map((f) => ({ question: f.q, answer: f.a })));

  return (
    <>
      <JsonLd data={[serviceLd, breadcrumbLd, faqLd]} />

      {/* HERO — реална снимка background + топъл градиент (като началната) */}
      <section className="relative overflow-hidden pt-32 pb-16 lg:pt-40 lg:pb-24">
        <Image src={img} alt={`${item.name} в Euphoria Hair & Beauty Bar, кв. Левски, Варна`} fill priority className="object-cover" sizes="100vw" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-background via-background/85 to-background/45 lg:bg-gradient-to-r lg:from-background lg:via-background/80 lg:to-transparent" />
        <div className="relative mx-auto max-w-7xl px-4 lg:px-10">
          <nav aria-label="Трохи" className="mb-8 flex flex-wrap items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            <Link href="/" className="hover:text-foreground">Начало</Link>
            <ChevronRight className="size-3" />
            <Link href="/uslugi" className="hover:text-foreground">Услуги</Link>
            <ChevronRight className="size-3" />
            <Link href={`/uslugi/${slug}`} className="hover:text-foreground">{category.title}</Link>
            <ChevronRight className="size-3" />
            <span className="text-foreground">{item.name}</span>
          </nav>
          <div className="max-w-2xl">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.25em] text-foreground/60">{category.shortTitle} · кв. Левски, Варна</p>
            <BlurText as="h1" text={`${item.name} във Варна`} className="font-display text-4xl leading-[1.05] font-medium text-balance md:text-5xl lg:text-6xl" stagger={0.025} />
            <p className="mt-6 font-serif text-xl italic text-muted-foreground">{content.tagline}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="h-12 rounded-md bg-foreground px-8 text-background hover:bg-primary">
                <Link href="/zapazi-chas"><Calendar className="size-4" /> Запиши час</Link>
              </Button>
              <span className="inline-flex items-center gap-2 rounded-md border border-border bg-background/60 px-4 py-2.5 font-display text-lg font-medium text-primary backdrop-blur">
                {priceLabel}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ВЪВЕДЕНИЕ */}
      <section className="border-y border-border/40 bg-secondary/40 py-16 lg:py-20">
        <div className="mx-auto max-w-3xl space-y-5 px-4 lg:px-8">
          {content.intro.map((p, i) => (
            <Reveal key={i} delay={i * 0.05}>
              <p className="text-lg leading-relaxed text-foreground/85">{p}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* КАКВО Е + ЗА КОГО */}
      <section className="py-16 lg:py-24">
        <div className="mx-auto grid max-w-5xl gap-12 px-4 lg:grid-cols-2 lg:px-8">
          <Reveal>
            <h2 className="font-display text-2xl font-medium md:text-3xl">Какво представлява</h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">{content.what}</p>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="font-display text-2xl font-medium md:text-3xl">За кого е подходящ</h2>
            <ul className="mt-4 space-y-2.5">
              {content.forWhom.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-muted-foreground">
                  <Check className="mt-1 size-4 shrink-0 text-primary" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* ПРОЦЕС */}
      <section className="border-y border-border/40 bg-cream py-16 lg:py-24">
        <div className="mx-auto max-w-4xl px-4 lg:px-8">
          <Reveal>
            <h2 className="mb-10 font-display text-3xl font-medium md:text-4xl">Как протича</h2>
          </Reveal>
          <ol className="space-y-6">
            {content.process.map((p, i) => (
              <Reveal key={p.step} delay={i * 0.05}>
                <li className="flex gap-5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-foreground font-display text-lg font-medium text-background">{i + 1}</span>
                  <div>
                    <h3 className="font-display text-xl font-medium">{p.step}</h3>
                    <p className="mt-1 leading-relaxed text-muted-foreground">{p.detail}</p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ГРИЖА СЛЕД */}
      <section className="py-16 lg:py-24">
        <div className="mx-auto max-w-3xl px-4 lg:px-8">
          <Reveal>
            <h2 className="mb-6 font-display text-2xl font-medium md:text-3xl">Грижа след процедурата</h2>
            <ul className="space-y-3">
              {content.aftercare.map((a) => (
                <li key={a} className="flex items-start gap-2.5 text-muted-foreground">
                  <Check className="mt-1 size-4 shrink-0 text-primary" />
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-border/40 bg-secondary/40 py-16 lg:py-24">
        <div className="mx-auto max-w-3xl px-4 lg:px-8">
          <Reveal>
            <h2 className="mb-8 font-display text-3xl font-medium md:text-4xl">Често задавани въпроси</h2>
          </Reveal>
          <div className="space-y-6">
            {content.faq.map((f, i) => (
              <Reveal key={f.q} delay={i * 0.04}>
                <div className="border-b border-border/50 pb-5">
                  <h3 className="font-medium">{f.q}</h3>
                  <p className="mt-2 leading-relaxed text-muted-foreground">{f.a}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA + sibling cross-links */}
      <section className="py-16 lg:py-24">
        <div className="mx-auto max-w-4xl px-4 text-center lg:px-8">
          <Reveal>
            <h2 className="font-display text-3xl font-medium md:text-4xl">Запази час за {item.name.toLowerCase()}</h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">В кв. Левски, Варна.{item.duration ? <> <Clock className="inline size-4" /> {item.duration} ·</> : ""} {priceLabel}</p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="h-12 rounded-md bg-foreground px-8 text-background hover:bg-primary">
                <Link href="/zapazi-chas"><Calendar className="size-4" /> Запиши час онлайн</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-md border-border px-8">
                <a href={`tel:${siteConfig.contact.phone}`}><Phone className="size-4" /> {siteConfig.contact.phoneFormatted}</a>
              </Button>
            </div>
          </Reveal>
          {siblings.length > 0 && (
            <Reveal delay={0.1}>
              <div className="mt-12 border-t border-border/40 pt-8">
                <p className="mb-4 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Виж също</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Link href={`/uslugi/${slug}`} className="rounded-full border border-border px-4 py-2 text-sm hover:border-foreground/50">Всички {category.title.toLowerCase()}</Link>
                  {siblings.map((s) =>
                    SERVICE_CONTENT[s.slug] ? (
                      <Link
                        key={s.slug}
                        href={`/uslugi/${slug}/${s.slug}`}
                        className="rounded-full border border-border px-4 py-2 text-sm hover:border-foreground/50 hover:text-foreground"
                      >
                        {s.name}
                      </Link>
                    ) : (
                      <span key={s.slug} className="rounded-full border border-border px-4 py-2 text-sm text-muted-foreground">{s.name}</span>
                    ),
                  )}
                </div>
              </div>
            </Reveal>
          )}
        </div>
      </section>
    </>
  );
}
