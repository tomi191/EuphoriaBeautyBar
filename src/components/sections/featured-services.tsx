import { Reveal } from "@/components/reactbits/reveal";
import { ExpandingCards, type ExpandingCard } from "@/components/reactbits/expanding-cards";
import { getServiceCatalog } from "@/lib/data/service-catalog";

const accents: Record<string, { corner: string; bg: string }> = {
  "frizorski-uslugi": { corner: "/illustrations/comb.svg", bg: "bg-cream" },
  "frizorski-terapii": { corner: "/illustrations/leaf.svg", bg: "bg-mint/30" },
  "manikyur-i-pedikyur": { corner: "/illustrations/flowers.svg", bg: "bg-blush-soft" },
  kozmetika: { corner: "/illustrations/lipstick.svg", bg: "bg-secondary" },
};

export async function FeaturedServices() {
  const serviceCategories = await getServiceCatalog();
  const cards: ExpandingCard[] = serviceCategories.map((c, i) => ({
    href: `/uslugi/${c.slug}`,
    index: i,
    title: c.title,
    shortTitle: c.shortTitle,
    description: c.description,
    image: c.heroImage,
    popular: [...c.popular],
    cornerSvg: accents[c.slug]?.corner,
    bgClass: accents[c.slug]?.bg ?? "bg-background",
  }));

  return (
    <section id="services" className="relative overflow-hidden bg-background py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 lg:px-10">
        <Reveal>
          <div className="grid gap-6 md:grid-cols-12 md:items-end">
            <div className="md:col-span-7">
              <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-foreground/60">
                Менюто
              </span>
              <h2 className="mt-5 font-display text-5xl leading-[1] font-medium text-balance md:text-7xl">
                Грижа, <em className="font-serif italic text-primary">която си личи</em>.
              </h2>
            </div>
            <p className="font-serif text-lg italic text-foreground/75 md:col-span-5">
              Коса, терапии, нокти и лице. Виж цените във всяка категория.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mt-12">
            <ExpandingCards cards={cards} />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
