import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/reactbits/reveal";

/**
 * Финален CTA — full-bleed editorial finale (огледало на hero-то).
 * Не дублира контактна информация; тя живее в FAQ+Contact и footer.
 * Тук е чист CTA за резервация — magazine-style.
 */
export function CtaBooking() {
  return (
    <section className="relative isolate overflow-hidden bg-foreground text-background">
      {/* Background image с тъмен treatment */}
      <Image
        src="/images/services/portrait-elegant.jpg"
        alt="Жена с елегантна прическа и грим след посещение в Euphoria Hair & Beauty Bar"
        fill
        sizes="100vw"
        className="absolute inset-0 -z-10 object-cover opacity-40"
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-foreground via-foreground/85 to-foreground/40" />

      {/* line-art accent */}
      <Image
        src="/illustrations/wave.svg"
        alt=""
        aria-hidden
        width={400}
        height={200}
        className="pointer-events-none absolute -bottom-8 right-8 hidden h-40 w-auto opacity-40 mix-blend-screen lg:block"
      />
      <Image
        src="/illustrations/star-burst.svg"
        alt=""
        aria-hidden
        width={160}
        height={160}
        className="pointer-events-none absolute right-[40%] top-12 hidden h-16 w-auto opacity-60 mix-blend-screen lg:block"
      />

      <div className="relative mx-auto max-w-7xl px-4 py-24 lg:px-10 lg:py-36">
        <Reveal>
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-mint">
            Преди да приключим
          </p>
          <h2 className="mt-5 max-w-3xl font-display text-5xl leading-[0.95] font-medium text-balance md:text-7xl lg:text-[6rem]">
            Един час за теб.{" "}
            <em className="font-serif italic text-mint">Цял ден промяна.</em>
          </h2>

          <div className="mt-10 flex flex-wrap items-center gap-5">
            <Button
              asChild
              size="lg"
              className="group h-14 rounded-full bg-mint px-8 text-base text-foreground hover:bg-mint/85"
            >
              <Link href="/zapazi-chas">
                <Calendar className="size-4" />
                Запиши час
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Link
              href="/uslugi"
              className="group inline-flex items-center gap-2 font-medium text-background/85 hover:text-background"
            >
              <span className="border-b border-background/40 pb-0.5 transition-colors group-hover:border-background">
                Прегледай ценоразписа
              </span>
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
