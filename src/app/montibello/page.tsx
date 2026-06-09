import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/reactbits/reveal";
import { BlurText } from "@/components/reactbits/blur-text";
import { Button } from "@/components/ui/button";
import { montibelloProducts } from "@/lib/data/montibello";

export const metadata: Metadata = {
  title: "Montibello HOP Ultra",
  description:
    "Цялата линия Montibello HOP Ultra — професионална грижа за коса с Repair, Volume, Silver, Hydration, Colour и Blonde формули.",
};

export default function MontibelloPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-border pt-32 pb-16 lg:pt-40 lg:pb-24">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <Reveal>
            <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Партньорска марка</p>
          </Reveal>
          <div className="grid items-end gap-10 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <BlurText
                as="h1"
                text="Montibello HOP Ultra"
                className="font-display text-5xl leading-[1.05] font-medium md:text-7xl lg:text-8xl"
              />
              <Reveal delay={0.4}>
                <p className="mt-6 max-w-xl font-serif text-xl italic text-muted-foreground">
                  Hair Oil Plus — професионална испанска линия с шест специализирани формули за всеки тип и нужда на косата.
                </p>
              </Reveal>
            </div>
            <Reveal className="lg:col-span-5" delay={0.2}>
              <div className="relative aspect-square w-full max-w-sm overflow-hidden rounded-md bg-secondary/40">
                <Image
                  src="/images/montibello/catalogue.jpg"
                  alt="Montibello каталог"
                  fill
                  sizes="(max-width: 1024px) 100vw, 33vw"
                  className="object-cover"
                />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {montibelloProducts.map((product, idx) => (
              <Reveal key={product.slug} delay={idx * 0.06}>
                <Link
                  href={`/montibello/${product.slug}`}
                  className="group relative block h-full overflow-hidden rounded-md border border-border bg-card transition-colors hover:border-foreground/30"
                >
                  <div
                    className="relative aspect-[4/5] overflow-hidden border-b border-border"
                    style={{ background: `radial-gradient(circle at 50% 30%, color-mix(in oklch, ${product.color} 18%, transparent), transparent 70%)` }}
                  >
                    <Image
                      src={product.productImage}
                      alt={product.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-contain p-10 transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-6 md:p-7">
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      0{idx + 1} · {product.line}
                    </p>
                    <h3 className="mt-3 font-display text-2xl font-medium md:text-3xl">{product.name}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {product.shortDescription}
                    </p>
                    <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs">
                      <span className="text-muted-foreground">За {product.forHairType.toLowerCase()}</span>
                      <span className="inline-flex items-center gap-1 font-medium text-foreground transition-transform group-hover:translate-x-0.5">
                        Детайли <ArrowRight className="size-3.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-secondary/30 py-20">
        <div className="mx-auto max-w-3xl px-4 text-center lg:px-8">
          <h2 className="font-display text-3xl font-medium md:text-4xl">
            Не си сигурна коя линия е за теб?
          </h2>
          <p className="mt-4 text-muted-foreground">
            Запиши консултация — ще оценим състоянието на косата и ще препоръчаме точния протокол.
          </p>
          <Button asChild size="lg" className="mt-8 h-12 rounded-md bg-foreground px-8 text-background hover:bg-foreground/90">
            <Link href="/contacts#booking">Запиши консултация <ArrowRight className="size-4" /></Link>
          </Button>
        </div>
      </section>
    </>
  );
}
