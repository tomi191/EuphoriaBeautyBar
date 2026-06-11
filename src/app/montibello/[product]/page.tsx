import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Calendar, CheckCircle2, ChevronRight } from "lucide-react";
import { Reveal } from "@/components/reactbits/reveal";
import { BlurText } from "@/components/reactbits/blur-text";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { siteConfig } from "@/lib/site";
import {
  montibelloProducts,
  montibelloCategories,
  getMontibelloProduct,
  hasDetailPage,
  accentColor,
} from "@/lib/data/montibello";

interface Params {
  params: Promise<{ product: string }>;
}

// Детайл страници имат само продуктите с реално описание (HOP линията).
export async function generateStaticParams() {
  return montibelloProducts.filter(hasDetailPage).map((p) => ({ product: p.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { product: slug } = await params;
  const product = getMontibelloProduct(slug);
  if (!product || !hasDetailPage(product)) return { robots: { index: false } };
  return {
    title: `${product.name} — Montibello`,
    description: product.shortDescription,
    alternates: { canonical: `/montibello/${product.slug}` },
    openGraph: {
      title: `${product.name} — Montibello`,
      description: product.shortDescription,
      url: `/montibello/${product.slug}`,
    },
  };
}

export default async function MontibelloProductPage({ params }: Params) {
  const { product: slug } = await params;
  const product = getMontibelloProduct(slug);
  if (!product || !hasDetailPage(product)) notFound();

  const others = montibelloProducts.filter((p) => p.slug !== product.slug && hasDetailPage(p)).slice(0, 3);
  const category = montibelloCategories.find((c) => c.slug === product.categorySlug);

  // Product schema БЕЗ Offer/price — не се продава онлайн, само се представя.
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    brand: { "@type": "Brand", name: "Montibello" },
    category: category?.title,
    ...(product.productImage && { image: `${siteConfig.url}${product.productImage}` }),
  };
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Начало", item: siteConfig.url },
      { "@type": "ListItem", position: 2, name: "Montibello", item: `${siteConfig.url}/montibello` },
      { "@type": "ListItem", position: 3, name: product.name, item: `${siteConfig.url}/montibello/${product.slug}` },
    ],
  };

  return (
    <>
      <JsonLd data={[productSchema, breadcrumb]} />

      <section className="relative pt-32 pb-16 lg:pt-40 lg:pb-24">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <nav aria-label="Трохи" className="mb-8 flex flex-wrap items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            <Link href="/" className="hover:text-foreground">Начало</Link>
            <ChevronRight className="size-3" />
            <Link href="/montibello" className="hover:text-foreground">Montibello</Link>
            <ChevronRight className="size-3" />
            <span className="text-foreground">{product.name}</span>
          </nav>

          <div className="grid items-center gap-12 lg:grid-cols-2">
            <Reveal>
              <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                {product.line} · {product.productType}
              </p>
              <BlurText
                as="h1"
                text={product.name}
                className="font-display text-5xl font-medium md:text-7xl"
              />
              <p className="mt-6 max-w-xl font-serif text-xl italic text-muted-foreground">
                {product.shortDescription}
              </p>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-foreground/85">
                {product.description}
              </p>
              <p className="mt-4 inline-flex rounded-md bg-secondary/50 px-3 py-1.5 text-xs text-muted-foreground">
                Предлага се само на място в салона.
              </p>
              <div className="mt-8 flex gap-3">
                <Button asChild size="lg" className="h-12 rounded-md bg-foreground px-8 text-background hover:bg-primary">
                  <Link href="/zapazi-chas">
                    <Calendar className="size-4" /> Запиши консултация
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 rounded-md px-8">
                  <Link href="/montibello">
                    <ArrowLeft className="size-4" /> Към каталога
                  </Link>
                </Button>
              </div>
            </Reveal>

            <Reveal delay={0.2}>
              <div
                className="relative aspect-square overflow-hidden rounded-md border border-border"
                style={{ background: `radial-gradient(circle at 50% 30%, color-mix(in oklch, ${accentColor(product.accent)} 22%, transparent), transparent 75%)` }}
              >
                {product.productImage && (
                  <Image
                    src={product.productImage}
                    alt={product.name}
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-contain p-12"
                    priority
                    fetchPriority="high"
                  />
                )}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {product.benefits && product.benefits.length > 0 && (
        <section className="border-y border-border bg-secondary/30 py-20 lg:py-28">
          <div className="mx-auto max-w-4xl px-4 lg:px-8">
            <Reveal>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">За какво помага</p>
              <h2 className="mt-2 font-display text-4xl font-medium md:text-5xl">
                Ползи и <span className="gradient-text">резултат</span>.
              </h2>
            </Reveal>
            <ul className="mt-10 grid gap-3 md:grid-cols-2">
              {product.benefits.map((b, i) => (
                <Reveal key={b} delay={i * 0.06}>
                  <li className="flex items-start gap-3 rounded-md border border-border bg-card p-5">
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-foreground" strokeWidth={1.6} />
                    <span className="text-base">{b}</span>
                  </li>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>
      )}

      {others.length > 0 && (
        <section className="py-20">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <div className="mb-10 flex items-end justify-between">
              <h2 className="font-display text-3xl font-medium md:text-4xl">Други от линията</h2>
              <Button asChild variant="ghost" className="hidden md:inline-flex">
                <Link href="/montibello">Виж всички <ArrowRight className="size-4" /></Link>
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {others.map((p) => (
                <Link
                  key={p.slug}
                  href={`/montibello/${p.slug}`}
                  className="group flex items-center gap-4 rounded-md border border-border bg-card p-5 transition-colors hover:border-foreground/30"
                >
                  <div
                    className="relative size-20 shrink-0 overflow-hidden rounded-md"
                    style={{ background: `radial-gradient(circle at 50% 35%, color-mix(in oklch, ${accentColor(p.accent)} 20%, transparent), transparent 75%)` }}
                  >
                    {p.productImage && (
                      <Image src={p.productImage} alt={p.name} fill sizes="80px" className="object-contain p-2" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-display text-lg font-medium">{p.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{p.shortDescription}</p>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
