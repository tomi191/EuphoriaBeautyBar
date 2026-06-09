import { Marquee } from "@/components/reactbits/marquee";
import { siteConfig } from "@/lib/site";

export function BrandsMarquee() {
  return (
    <section className="relative overflow-hidden border-y border-foreground/10 bg-cream">
      <div className="relative mx-auto flex max-w-7xl items-center gap-6 px-4 py-5 lg:px-10">
        <span className="hidden shrink-0 font-mono text-[11px] uppercase tracking-[0.25em] text-foreground/60 md:inline">
          С какво работим
        </span>
        <span aria-hidden className="hidden h-px flex-1 bg-foreground/15 md:block" />
        <div className="flex-1 overflow-hidden">
          <Marquee pauseOnHover>
            {[...siteConfig.brands, ...siteConfig.brands].map((brand, i) => (
              <span
                key={`${brand}-${i}`}
                className="mx-8 font-display text-2xl font-medium tracking-tight text-foreground/65 transition-colors hover:text-foreground md:text-3xl"
              >
                {brand}
              </span>
            ))}
          </Marquee>
        </div>
      </div>
    </section>
  );
}
