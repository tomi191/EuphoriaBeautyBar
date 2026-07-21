import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/reactbits/reveal";

export function GiftCardBanner() {
  return (
    <section className="relative overflow-hidden bg-background py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 lg:px-10">
        <Reveal>
          <div className="relative grid items-stretch gap-0 overflow-hidden rounded-md border border-foreground/10 lg:grid-cols-12">
            {/* Лява колона — текст on blush */}
            <div className="relative bg-blush-soft p-8 md:p-12 lg:col-span-7 lg:p-16">
              {/* line-art accents */}
              <Image
                src="/illustrations/flowers.svg"
                alt=""
                aria-hidden
                width={300}
                height={320}
                className="pointer-events-none absolute -top-4 right-8 hidden h-44 w-auto opacity-50 mix-blend-multiply md:block"
              />
              <Image
                src="/illustrations/star-burst.svg"
                alt=""
                aria-hidden
                width={160}
                height={160}
                className="pointer-events-none absolute right-[35%] top-8 h-12 w-auto opacity-70 mix-blend-multiply"
              />

              <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-foreground/60">
                Подарък от Euphoria
              </span>
              <h2 className="mt-5 font-display text-5xl leading-[1] font-medium text-balance md:text-6xl lg:text-7xl">
                Подари <em className="font-serif italic text-primary">красота</em>.
              </h2>
              <p className="mt-6 max-w-md font-serif text-lg italic text-foreground/75">
                За рожден ден, годишнина — или без повод. Избери стойност или конкретна процедура — ние я подготвяме за теб.
              </p>
              <Button
                asChild
                size="lg"
                className="group mt-8 h-14 rounded-full bg-foreground px-8 text-base text-background hover:bg-primary"
              >
                <Link href="/contacts#gift">
                  Поръчай ваучер
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>

            {/* Дясна колона — карта + accent */}
            <div className="relative grid place-items-center bg-foreground p-8 lg:col-span-5 lg:p-12">
              <Image
                src="/illustrations/squiggle.svg"
                alt=""
                aria-hidden
                width={400}
                height={60}
                className="pointer-events-none absolute -top-2 left-0 h-10 w-2/3 text-mint"
              />
              <div className="relative">
                <div aria-hidden className="absolute -inset-8 rounded-full bg-mint/30 blur-2xl" />
                <div className="relative aspect-[3/4] w-48 overflow-hidden rounded-md border border-background/15 bg-background/5 md:w-60">
                  <Image
                    src="/images/brand/gift-card.png"
                    alt="Euphoria подаръчна карта"
                    fill
                    sizes="240px"
                    className="object-contain p-4"
                  />
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
