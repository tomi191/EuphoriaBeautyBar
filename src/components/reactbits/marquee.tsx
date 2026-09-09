"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface MarqueeProps extends React.HTMLAttributes<HTMLDivElement> {
  reverse?: boolean;
  pauseOnHover?: boolean;
  vertical?: boolean;
  repeat?: number;
}

/**
 * Безкрайна лента. Анимацията транслира едно копие с точно -100% минус разстоянието,
 * затова ДВЕ копия дават безшевен цикъл: докато първото излиза, второто влиза.
 * Четирите копия бяха трикратно излишен DOM — на началната страница това правеше
 * 100 карти с отзиви и 606 вградени икони, тоест ~0,5 MB HTML (одит №7).
 * Копията след първото са декоративни и се скриват от екранните четци,
 * иначе четецът прочита целия списък с отзиви два пъти.
 */
export function Marquee({
  className,
  reverse,
  pauseOnHover = false,
  vertical = false,
  repeat = 2,
  children,
  ...props
}: MarqueeProps) {
  return (
    <div
      {...props}
      className={cn(
        "group flex overflow-hidden p-2 [--gap:2rem] [gap:var(--gap)]",
        vertical ? "flex-col" : "flex-row",
        className,
      )}
    >
      {Array.from({ length: repeat }).map((_, i) => (
        <div
          key={i}
          aria-hidden={i > 0 || undefined}
          className={cn(
            "flex shrink-0 justify-around [gap:var(--gap)]",
            vertical ? "animate-marquee-vertical flex-col" : "animate-marquee flex-row",
            pauseOnHover && "group-hover:[animation-play-state:paused]",
            reverse && "[animation-direction:reverse]",
          )}
        >
          {children}
        </div>
      ))}
    </div>
  );
}
