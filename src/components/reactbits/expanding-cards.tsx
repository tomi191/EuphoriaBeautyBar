"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ExpandingCard {
  href: string;
  index: number;
  title: string;
  shortTitle: string;
  description: string;
  image: string;
  popular: string[];
  iconSvg?: string;
  cornerSvg?: string;
  bgClass: string;
}

interface ExpandingCardsProps {
  cards: ExpandingCard[];
  className?: string;
}

/**
 * ExpandingCards — 4 portrait карти на един ред (9:16). Hover/focus expand-ва
 * избраната карта в широка landscape с пълно съдържание. Премахва
 * необходимостта от 2×2 grid и дава съвременен интерактивен beauty look.
 *
 * На mobile (<lg) cards stacks вертикално с пълно visible content.
 */
export function ExpandingCards({ cards, className }: ExpandingCardsProps) {
  const [active, setActive] = React.useState<number | null>(null);

  return (
    <div className={cn("flex flex-col gap-4 lg:h-[640px] lg:flex-row lg:gap-3", className)}>
      {cards.map((card, i) => {
        const isActive = active === i;
        const isCompressed = active !== null && active !== i;

        return (
          <motion.div
            key={card.href}
            layout
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
            className={cn(
              "group relative overflow-hidden rounded-md border border-foreground/10 transition-[flex-grow] duration-700 ease-out lg:flex-1",
              isActive && "lg:flex-[3]",
              isCompressed && "lg:flex-[0.85]",
              card.bgClass,
            )}
          >
            <Link
              href={card.href}
              aria-label={card.title}
              className="relative block h-full w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
            >
              {/* Image fill */}
              <Image
                src={card.image}
                alt={card.title}
                fill
                sizes="(max-width: 1024px) 100vw, 60vw"
                quality={90}
                className="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.06]"
                priority={i < 2}
              />

              {/* Default gradient + collapsed view */}
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/30 to-foreground/15 transition-opacity duration-500 group-hover:opacity-90" />

              {/* Index */}
              <span className="absolute left-5 top-5 z-10 font-mono text-[11px] uppercase tracking-[0.25em] text-background/85">
                0{card.index + 1}
              </span>

              {/* Corner illustration */}
              {card.cornerSvg && (
                <Image
                  src={card.cornerSvg}
                  alt=""
                  aria-hidden
                  width={200}
                  height={200}
                  className={cn(
                    "pointer-events-none absolute -bottom-6 -right-6 h-32 w-auto opacity-50 mix-blend-screen transition-all duration-700",
                    isActive && "scale-110 opacity-70",
                  )}
                />
              )}

              {/* Title — винаги визуално, в долен ляв ъгъл */}
              <div className="absolute inset-x-0 bottom-0 z-10 p-6 md:p-7">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-mint">
                  {card.shortTitle}
                </p>
                <h3 className="mt-2 font-display text-2xl leading-tight font-medium text-background md:text-3xl lg:text-4xl">
                  {card.title}
                </h3>

                {/* Expanded content — fade in при hover/focus */}
                <motion.div
                  initial={false}
                  animate={{
                    opacity: isActive ? 1 : 0,
                    height: isActive ? "auto" : 0,
                  }}
                  transition={{ duration: 0.5, delay: isActive ? 0.25 : 0 }}
                  className="overflow-hidden"
                >
                  <p className="mt-4 max-w-md text-sm leading-relaxed text-background/85 lg:text-base">
                    {card.description}
                  </p>
                  <ul className="mt-5 flex flex-wrap gap-1.5">
                    {card.popular.map((p) => (
                      <li
                        key={p}
                        className="rounded-full border border-background/30 bg-background/15 px-3 py-1 text-[11px] font-medium text-background backdrop-blur"
                      >
                        {p}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6 inline-flex items-center gap-2 font-medium text-background">
                    <span className="border-b border-background/60">Виж пълния ценоразпис</span>
                    <ArrowUpRight className="size-4" />
                  </div>
                </motion.div>
              </div>

              {/* Default mobile визия — винаги visible details */}
              <div className="absolute inset-x-0 bottom-0 z-0 p-6 lg:hidden">
                <p className="mt-2 max-w-md text-sm text-background/80">{card.description}</p>
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {card.popular.slice(0, 3).map((p) => (
                    <li
                      key={p}
                      className="rounded-full border border-background/25 bg-background/10 px-2.5 py-0.5 text-[11px] text-background backdrop-blur"
                    >
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
