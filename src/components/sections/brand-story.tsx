import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/reactbits/reveal";
import { siteConfig } from "@/lib/site";

/**
 * BrandStory — секция за МАРКАТА/мястото (не за човека). Заменя бившата
 * person-портрет секция на началната, за да остане фокусът върху Euphoria
 * като beauty bar. Историята на Снежана живее на /za-nas.
 */
export function BrandStory() {
  return (
    <section id="about" className="relative overflow-hidden bg-cream py-20 lg:py-28">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 lg:grid-cols-12 lg:gap-16 lg:px-10">
        <Reveal className="lg:col-span-5">
          <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-foreground/60">
            За Euphoria
          </span>
          <h2 className="mt-5 font-display text-5xl leading-[1] font-medium text-balance md:text-6xl">
            Работим само с <em className="font-serif italic text-primary">професионални марки</em>.
          </h2>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-foreground/80">
            В просторен салон в кв. Левски, отворен през 2023, събираме коса, нокти и лице на едно място. Държим на стерилни условия и на резултат, който се вижда и след седмици.
          </p>

          <div className="mt-8 flex flex-wrap gap-2">
            {siteConfig.brands.slice(0, 5).map((b) => (
              <span
                key={b}
                className="rounded-full border border-foreground/15 bg-background px-3 py-1.5 text-xs font-medium text-foreground"
              >
                {b}
              </span>
            ))}
          </div>

          <Link href="/uslugi" className="group mt-8 inline-flex items-center gap-2 font-medium text-foreground">
            <span className="border-b border-foreground/30 transition-colors group-hover:border-foreground">
              Разгледай услугите
            </span>
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Reveal>

        <Reveal className="lg:col-span-7" delay={0.1}>
          <div className="relative">
            <div aria-hidden className="absolute inset-x-6 -bottom-5 top-10 -z-10 rounded-md bg-mint" />
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md bg-secondary">
              <Image
                src="/images/interior/salon-1.jpg"
                alt="Прическа от Euphoria Hair & Beauty Bar, кв. Левски, Варна"
                fill
                sizes="(max-width: 1024px) 100vw, 58vw"
                quality={90}
                className="object-cover"
              />
            </div>
            <div className="absolute -bottom-3 left-6 rounded-md border border-border bg-background px-5 py-3 soft-shadow">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/60">Euphoria</p>
              <p className="mt-1 font-display text-xl">кв. Левски, Варна</p>
              <p className="text-xs text-muted-foreground">Отворен от 2023</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
