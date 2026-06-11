import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/reactbits/reveal";
import { BlurText } from "@/components/reactbits/blur-text";
import { Button } from "@/components/ui/button";
import { LineDivider } from "@/components/brand/line-divider";
import { JsonLd } from "@/components/seo/json-ld";
import { siteConfig } from "@/lib/site";
import {
  montibelloCategories,
  productsByCategory,
  accentColor,
  hasDetailPage,
  montibelloProducts,
} from "@/lib/data/montibello";

export const metadata: Metadata = {
  title: "Montibello — каталог по категории",
  alternates: { canonical: "/montibello" },
  description:
    "Каталогът на Montibello, с който работим в Euphoria — грижа за коса (HOP Ultra), боядисване, оксиданти, стайлинг и технически терапии. Купуват се на място в салона.",
  openGraph: {
    title: "Montibello — каталог по категории",
    description: "Професионалната гама Montibello в Euphoria, Варна. Покупка на място в салона.",
    url: "/montibello",
  },
};

export default function MontibelloPage() {
  // ItemList schema БЕЗ Offer — представяме каталог, не онлайн магазин.
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Montibello каталог — Euphoria",
    itemListElement: montibelloProducts.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Product",
        name: p.name,
        category: montibelloCategories.find((c) => c.slug === p.categorySlug)?.title,
        brand: { "@type": "Brand", name: "Montibello" },
        ...(p.description && { description: p.description }),
        ...(p.productImage && { image: `${siteConfig.url}${p.productImage}` }),
        ...(hasDetailPage(p) && { url: `${siteConfig.url}/montibello/${p.slug}` }),
      },
    })),
  };

  return (
    <>
      <JsonLd data={itemListSchema} />

      <section className="relative overflow-hidden pt-32 pb-12 lg:pt-40 lg:pb-16">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <Reveal>
            <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Партньорска марка</p>
          </Reveal>
          <div className="grid items-end gap-10 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <BlurText
                as="h1"
                text="Montibello"
                className="font-display text-5xl leading-[1.05] font-medium md:text-7xl lg:text-8xl"
              />
              <Reveal delay={0.3}>
                <p className="mt-6 max-w-xl font-serif text-xl italic text-muted-foreground">
                  Испанска професионална марка от Барселона. В Euphoria работим с цялата ѝ гама — грижа, цвят, стайлинг и салонни терапии.
                </p>
              </Reveal>
            </div>
            <Reveal className="lg:col-span-5" delay={0.2}>
              <div className="relative aspect-square w-full max-w-sm overflow-hidden rounded-md bg-secondary/40">
                <Image
                  src="/images/montibello/catalogue.jpg"
                  alt="Каталог Montibello"
                  fill
                  sizes="(max-width: 1024px) 100vw, 33vw"
                  className="object-cover"
                />
              </div>
            </Reveal>
          </div>

          {/* Категорийна навигация */}
          <Reveal delay={0.2}>
            <nav aria-label="Категории" className="mt-12 flex flex-wrap gap-2">
              {montibelloCategories.map((c) => (
                <a
                  key={c.slug}
                  href={`#${c.slug}`}
                  className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground/80 transition-colors hover:border-foreground/40 hover:text-foreground"
                >
                  {c.shortTitle}
                </a>
              ))}
            </nav>
          </Reveal>

          <Reveal delay={0.3}>
            <p className="mt-6 inline-flex rounded-md bg-secondary/50 px-4 py-2 text-sm text-muted-foreground">
              Продуктите се предлагат само на място в салона — не продаваме онлайн. Питай за наличност и съвет при записан час.
            </p>
          </Reveal>
        </div>
      </section>

      <LineDivider />

      {montibelloCategories.map((category) => {
        const products = productsByCategory(category.slug);
        if (products.length === 0) return null;
        return (
          <section key={category.slug} id={category.slug} className="scroll-mt-24 py-16 lg:py-20">
            <div className="mx-auto max-w-7xl px-4 lg:px-8">
              <Reveal>
                <div className="max-w-2xl">
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">{category.shortTitle}</p>
                  <h2 className="mt-2 font-display text-4xl font-medium md:text-5xl">{category.title}</h2>
                  <p className="mt-4 text-muted-foreground">{category.description}</p>
                </div>
              </Reveal>

              <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
                {products.map((product, idx) => {
                  const detail = hasDetailPage(product);
                  const inner = (
                    <>
                      <div
                        className="relative aspect-[4/5] overflow-hidden border-b border-border"
                        style={{ background: `radial-gradient(circle at 50% 30%, color-mix(in oklch, ${accentColor(product.accent)} 18%, transparent), transparent 70%)` }}
                      >
                        {product.productImage ? (
                          <Image
                            src={product.productImage}
                            alt={product.name}
                            fill
                            sizes="(max-width: 768px) 100vw, 33vw"
                            className="object-contain p-10 transition-transform duration-700 group-hover:scale-105"
                          />
                        ) : (
                          <div className="grid h-full place-items-center">
                            <span className="font-display text-3xl font-medium text-foreground/30">{product.line}</span>
                          </div>
                        )}
                      </div>
                      <div className="p-6 md:p-7">
                        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                          0{idx + 1} · {product.productType}
                        </p>
                        <h3 className="mt-3 font-display text-2xl font-medium md:text-3xl">{product.name}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{product.shortDescription}</p>
                        <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs">
                          {product.forHairType && (
                            <span className="text-muted-foreground">За {product.forHairType.toLowerCase()}</span>
                          )}
                          {detail && (
                            <span className="inline-flex items-center gap-1 font-medium text-foreground transition-transform group-hover:translate-x-0.5">
                              Детайли <ArrowRight className="size-3.5" />
                            </span>
                          )}
                        </div>
                      </div>
                    </>
                  );

                  const cls =
                    "group relative block h-full overflow-hidden rounded-md border border-border bg-card transition-colors hover:border-foreground/30";
                  return detail ? (
                    <Reveal key={product.slug} delay={idx * 0.05}>
                      <Link href={`/montibello/${product.slug}`} className={cls}>
                        {inner}
                      </Link>
                    </Reveal>
                  ) : (
                    <Reveal key={product.slug} delay={idx * 0.05}>
                      <div className={cls}>{inner}</div>
                    </Reveal>
                  );
                })}
              </div>
            </div>
          </section>
        );
      })}

      <LineDivider />

      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4 text-center lg:px-8">
          <h2 className="font-display text-3xl font-medium md:text-4xl">Не си сигурна кой продукт е за теб?</h2>
          <p className="mt-4 text-muted-foreground">
            Запиши консултация — ще оценим състоянието на косата и ще препоръчаме точния продукт от гамата. Купуваш го на място.
          </p>
          <Button asChild size="lg" className="mt-8 h-12 rounded-md bg-foreground px-8 text-background hover:bg-primary">
            <Link href="/zapazi-chas">Запиши консултация <ArrowRight className="size-4" /></Link>
          </Button>
        </div>
      </section>
    </>
  );
}
