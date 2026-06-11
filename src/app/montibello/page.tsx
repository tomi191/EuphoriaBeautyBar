import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/reactbits/reveal";
import { BlurText } from "@/components/reactbits/blur-text";
import { Button } from "@/components/ui/button";
import { LineDivider } from "@/components/brand/line-divider";
import { CatalogTabs } from "@/components/montibello/catalog-tabs";
import { JsonLd } from "@/components/seo/json-ld";
import { siteConfig } from "@/lib/site";
import { montibelloCategories, montibelloProducts } from "@/lib/data/montibello";

export const metadata: Metadata = {
  title: "Montibello — каталог по категории",
  description:
    "Montibello е партньорската марка, с която работим в Euphoria, Варна — грижа за коса, цвят и стайлинг. Каталог по категории; покупка на място в салона след консултация.",
  alternates: { canonical: "/montibello" },
  openGraph: {
    title: "Montibello — каталог по категории",
    description:
      "Професионалната гама Montibello в Euphoria, Варна. Каталог по категории, покупка на място в салона.",
    url: `${siteConfig.url}/montibello`,
  },
};

export default function MontibelloPage() {
  // ItemList schema БЕЗ Offer/price/AggregateOffer — представяме каталог, не онлайн магазин.
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Montibello каталог — Euphoria",
    numberOfItems: montibelloProducts.length,
    itemListElement: montibelloProducts.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Product",
        name: p.name,
        category: montibelloCategories.find((c) => c.slug === p.categorySlug)?.title,
        brand: { "@type": "Brand", name: "Montibello" },
        ...(p.description && { description: p.description }),
        ...(p.officialImage && { image: `${siteConfig.url}${p.officialImage}` }),
        url: `${siteConfig.url}/montibello/${p.slug}`,
      },
    })),
  };

  return (
    <>
      <JsonLd data={itemListSchema} />

      {/* Hero — брандова история */}
      <section className="relative overflow-hidden pt-32 pb-12 lg:pt-40 lg:pb-16">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <Reveal>
            <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Партньорска марка
            </p>
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
                  Испанска професионална марка от Барселона.
                </p>
              </Reveal>
              <Reveal delay={0.4}>
                <p className="mt-5 max-w-xl text-base leading-relaxed text-foreground/85">
                  В Euphoria работим с цялата гама Montibello — грижа за косата, цвят
                  и стайлинг. Каталогът по-долу е подреден по категории, за да намериш
                  по-лесно линията, която ти трябва. Купуваш на място в салона, след
                  като майстор прецени какво е точно за твоята коса.
                </p>
              </Reveal>
            </div>
            <Reveal className="lg:col-span-5" delay={0.2}>
              <div className="relative aspect-square w-full max-w-sm overflow-hidden rounded-md bg-secondary/40">
                <Image
                  src="/images/montibello/catalogue.jpg"
                  alt="Продукти от каталога на Montibello в салон Euphoria, Варна"
                  fill
                  sizes="(max-width: 1024px) 100vw, 33vw"
                  className="object-cover"
                  priority
                />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <LineDivider />

      {/* Каталог по категории — табове + филтриран грид */}
      <section className="pb-4">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <CatalogTabs categories={montibelloCategories} products={montibelloProducts} />
        </div>
      </section>

      {/* Disclaimer — само на място, спокоен тон */}
      <section className="pb-16">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <Reveal>
            <p className="inline-flex rounded-md bg-secondary/50 px-4 py-3 text-sm text-muted-foreground">
              Продуктите се предлагат само на място в салона - не продаваме онлайн.
              Питай за наличност и съвет при записан час.
            </p>
          </Reveal>
        </div>
      </section>

      <LineDivider />

      {/* CTA — консултация */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4 text-center lg:px-8">
          <h2 className="font-display text-3xl font-medium md:text-4xl">
            Не си сигурна кой продукт е за теб?
          </h2>
          <p className="mt-4 text-muted-foreground">
            Запиши консултация - ще оценим състоянието на косата и ще препоръчаме точния
            продукт от гамата. Купуваш го на място в салона.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-8 h-12 rounded-md bg-foreground px-8 text-background hover:bg-primary"
          >
            <Link href="/zapazi-chas">
              Запиши консултация <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
