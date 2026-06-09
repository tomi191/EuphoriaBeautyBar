import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Flower2, HandHeart, Scissors, Sparkles } from "lucide-react";
import type { ServiceCategory } from "@/lib/data/services";
import { SpotlightCard } from "@/components/reactbits/spotlight-card";

const iconMap = {
  scissors: Scissors,
  sparkles: Sparkles,
  "hand-heart": HandHeart,
  flower: Flower2,
} as const;

export function ServiceCard({ category, index = 0 }: { category: ServiceCategory; index?: number }) {
  const Icon = iconMap[category.icon];
  return (
    <SpotlightCard className="group/card h-full border-border/60 bg-card">
      <Link href={`/uslugi/${category.slug}`} className="relative block h-full overflow-hidden rounded-3xl">
        <div className="relative aspect-[16/10] w-full overflow-hidden">
          <Image
            src={category.heroImage}
            alt={category.title}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover transition-transform duration-[900ms] ease-out group-hover/card:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
          <div className="absolute top-5 left-5 grid size-12 place-items-center rounded-2xl border border-border/60 bg-background/85 text-primary backdrop-blur">
            <Icon className="size-5" strokeWidth={1.6} />
          </div>
          <ArrowUpRight className="absolute top-5 right-5 size-5 text-foreground/70 transition-all duration-500 group-hover/card:-translate-y-1 group-hover/card:translate-x-1 group-hover/card:text-primary" />
        </div>

        <div className="p-7 md:p-8">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            0{index + 1} · {category.shortTitle}
          </p>
          <h3 className="mt-3 font-display text-3xl font-medium md:text-4xl">{category.title}</h3>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground md:text-base">
            {category.description}
          </p>
          <div className="mt-6 flex flex-wrap items-baseline gap-3 border-t border-border/40 pt-5 text-xs">
            {category.featured.slice(0, 3).map((item) => (
              <span key={item.name} className="text-muted-foreground">
                {item.name}{" "}
                <span className="ml-1 font-display text-base font-medium text-foreground">
                  {item.priceFrom ? "от " : ""}
                  {item.price}{" "}
                  <span className="text-xs font-normal text-muted-foreground">{item.currency}</span>
                </span>
              </span>
            ))}
          </div>
        </div>
      </Link>
    </SpotlightCard>
  );
}
