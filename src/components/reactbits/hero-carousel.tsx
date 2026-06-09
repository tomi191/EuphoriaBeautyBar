"use client";

import * as React from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

export interface HeroSlide {
  src: string;
  alt: string;
  caption?: string;
}

interface HeroCarouselProps {
  slides: HeroSlide[];
  interval?: number;
  className?: string;
}

/**
 * HeroCarousel — full-bleed image carousel с slow crossfade. Автоматично сменя
 * слайдове, без разсейване от стрелки/dots на place; вместо това показваме мек
 * progress индикатор отдолу.
 */
export function HeroCarousel({ slides, interval = 6000, className }: HeroCarouselProps) {
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  React.useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % slides.length), interval);
    return () => clearInterval(id);
  }, [paused, interval, slides.length]);

  return (
    <div
      className={cn("relative isolate h-full w-full overflow-hidden", className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <AnimatePresence>
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
        >
          <Image
            src={slides[index].src}
            alt={slides[index].alt}
            fill
            sizes="100vw"
            priority={index === 0}
            className="object-cover"
          />
        </motion.div>
      </AnimatePresence>

      {slides[index].caption && (
        <AnimatePresence mode="wait">
          <motion.span
            key={`cap-${index}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="absolute right-6 top-6 z-20 hidden rounded-full bg-background/85 px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-foreground backdrop-blur md:inline-flex"
          >
            {slides[index].caption}
          </motion.span>
        </AnimatePresence>
      )}

      {/* Progress dots */}
      <div className="absolute bottom-6 right-6 z-20 flex gap-1.5 md:bottom-8 md:right-8">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            aria-label={`Слайд ${i + 1}`}
            className="group/dot relative h-1 w-8 overflow-hidden rounded-full bg-white/30 transition-colors hover:bg-white/50"
          >
            {i === index && (
              <motion.span
                key={`progress-${i}-${paused}`}
                className="absolute inset-y-0 left-0 bg-white"
                initial={{ width: "0%" }}
                animate={{ width: paused ? "var(--p, 0%)" : "100%" }}
                transition={{ duration: paused ? 0 : interval / 1000, ease: "linear" }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
