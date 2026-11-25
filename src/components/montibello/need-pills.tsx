"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export interface NeedPill {
  slug: string;
  label: string;
  count: number;
  image?: string;
}

/**
 * Хапчетата по нужда (посока А): всяко е котва към своя раздел и не скрива продукти
 * (всички връзки остават в HTML). Отбелязано е хапчето на раздела, който е на екрана.
 * На телефон са два реда, които се плъзгат настрани.
 */
export function NeedPills({ needs }: { needs: NeedPill[] }) {
  const [active, setActive] = useState(needs[0]?.slug);

  useEffect(() => {
    const sections = needs
      .map((n) => document.getElementById(n.slug))
      .filter((el): el is HTMLElement => el !== null);
    const io = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setActive(top.target.id);
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [needs]);

  const pill = (n: NeedPill) => {
    const on = n.slug === active;
    return (
      <a
        key={n.slug}
        href={`#${n.slug}`}
        onClick={() => setActive(n.slug)}
        aria-current={on ? "true" : undefined}
        className={cn(
          "inline-flex h-12 shrink-0 items-center gap-2.5 rounded-full border py-1.5 pr-4 pl-1.5 text-[15px] font-medium whitespace-nowrap transition-colors",
          on ? "border-foreground bg-foreground text-background" : "border-border bg-card text-foreground hover:border-foreground/40",
        )}
      >
        <span className="relative size-9 overflow-hidden rounded-full bg-white">
          {n.image && <Image src={n.image} alt="" fill sizes="36px" className="object-contain p-[6%]" />}
        </span>
        {n.label}
        <span className={cn("text-[13px]", on ? "text-background/70" : "text-muted-foreground")}>{n.count}</span>
      </a>
    );
  };

  const half = Math.ceil(needs.length / 2);
  return (
    <>
      <nav aria-label="Избор по нужда" className="hidden flex-wrap gap-3 lg:flex">
        {needs.map(pill)}
      </nav>
      <nav
        aria-label="Избор по нужда"
        className="-mr-4 grid gap-3 overflow-x-auto pr-4 pb-1 [scrollbar-width:none] lg:hidden"
      >
        <div className="flex gap-2.5">{needs.slice(0, half).map(pill)}</div>
        <div className="flex gap-2.5">{needs.slice(half).map(pill)}</div>
      </nav>
    </>
  );
}
