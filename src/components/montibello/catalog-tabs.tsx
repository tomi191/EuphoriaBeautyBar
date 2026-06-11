"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  accentColor,
  type MontibelloCategory,
  type MontibelloProduct,
} from "@/lib/data/montibello";
import { Reveal } from "@/components/reactbits/reveal";
import { cn } from "@/lib/utils";

interface CatalogTabsProps {
  categories: MontibelloCategory[];
  products: MontibelloProduct[];
}

const ALL = "all";

export function CatalogTabs({ categories, products }: CatalogTabsProps) {
  const [active, setActive] = React.useState<string>(ALL);

  const filtered =
    active === ALL
      ? products
      : products.filter((p) => p.categorySlug === active);

  const tabClass = (isActive: boolean) =>
    cn(
      "rounded-full border px-4 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
      isActive
        ? "border-foreground bg-foreground text-background"
        : "border-border text-foreground hover:border-foreground/50",
    );

  return (
    <div>
      {/* Tab bar — sticky под header-а, остава видим при скрол на грида */}
      <div className="sticky top-16 z-20 -mx-4 mb-6 border-b border-border bg-background/95 px-4 py-3 backdrop-blur lg:mb-8">
        <div
          role="tablist"
          aria-label="Категории Montibello"
          className="flex gap-2 overflow-x-auto"
        >
          <button
            type="button"
            role="tab"
            aria-selected={active === ALL}
            onClick={() => setActive(ALL)}
            className={tabClass(active === ALL)}
          >
            Всички
          </button>
          {categories.map((c) => (
            <button
              key={c.slug}
              type="button"
              role="tab"
              aria-selected={active === c.slug}
              onClick={() => setActive(c.slug)}
              className={tabClass(active === c.slug)}
            >
              {c.shortTitle}
            </button>
          ))}
        </div>
      </div>

      {/* Филтриран грид */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
        {filtered.map((p, i) => (
          <Reveal key={p.slug} delay={Math.min(i, 6) * 0.04}>
            <ProductCard product={p} />
          </Reveal>
        ))}
      </div>
    </div>
  );
}

function ProductCard({ product: p }: { product: MontibelloProduct }) {
  return (
    <Link
      href={`/montibello/${p.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-md border border-border bg-card transition-colors hover:border-foreground/30"
    >
      {/* Изображение / акцентен fallback */}
      <div
        className="relative aspect-[4/5] overflow-hidden"
        style={{
          background: `radial-gradient(circle at 50% 30%, color-mix(in oklch, ${accentColor(
            p.accent,
          )} 18%, transparent), transparent 70%)`,
        }}
      >
        {p.officialImage ? (
          <Image
            src={p.officialImage}
            fill
            className="object-contain p-8"
            sizes="(max-width:768px) 100vw, 33vw"
            alt={p.name}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display text-2xl text-foreground/70">
              {p.line}
            </span>
          </div>
        )}
      </div>

      {/* Тяло */}
      <div className="flex flex-1 flex-col gap-2 p-5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {p.productType}
          </span>
          {p.professional && (
            <span className="rounded-full border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              салон
            </span>
          )}
        </div>

        <h3 className="font-display text-xl md:text-2xl">{p.name}</h3>

        <p className="text-sm text-muted-foreground">{p.shortDescription}</p>

        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
          {p.forHairType ? (
            <span className="text-xs text-muted-foreground">{p.forHairType}</span>
          ) : (
            <span aria-hidden />
          )}
          <span className="shrink-0 text-sm font-medium text-primary transition-transform group-hover:translate-x-0.5">
            Детайли →
          </span>
        </div>
      </div>
    </Link>
  );
}
