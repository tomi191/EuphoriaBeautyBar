"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { ArrowDown, ArrowRight, Calendar, Clock, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeroProps {
  /** Реален Google рейтинг — подава се от сървъра. Badge се показва само при реални данни. */
  rating?: { value: number; count: number } | null;
}

/** Днешното работно време по график: Пон-Пет 09-18, Съб 09-17, Нед почивен. */
function todayHours(): { open: boolean; label: string } {
  const wd = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Sofia", weekday: "short" }).format(new Date());
  if (wd === "Sun") return { open: false, label: "Почивен ден" };
  if (wd === "Sat") return { open: true, label: "09:00 – 17:00" };
  return { open: true, label: "09:00 – 18:00" };
}

export function Hero({ rating }: HeroProps) {
  const today = todayHours();
  return (
    <section className="relative isolate min-h-[88svh] overflow-hidden bg-cream">
      {/* Фон — реалната снимка на салона */}
      <Image
        src="/images/interior/hero-bg.png"
        alt="Интериорът на Euphoria Hair & Beauty Bar в кв. Левски, Варна — столове, огледала и зеленина"
        fill
        priority
        // LCP елементът: fetchpriority=high го нарежда пред фонтовете/логата в опашката.
        fetchPriority="high"
        quality={75}
        sizes="100vw"
        className="-z-20 object-cover object-center"
      />

      {/* Топъл воал — четим текст отляво, снимката се отваря отдясно */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/82 to-background/40 lg:bg-gradient-to-r lg:from-background lg:via-background/80 lg:to-transparent"
      />

      <div className="relative z-10 mx-auto flex min-h-[88svh] max-w-7xl flex-col px-4 pt-28 pb-7 lg:px-10 lg:pt-32">
        {/* Основно съдържание — вертикално центрирано */}
        <div className="flex flex-1 items-center">
          <div className="max-w-2xl">
            <motion.span
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.25em] text-foreground/60"
            >
              <span className="h-px w-8 bg-foreground/40" />
              Beauty bar · Варна
            </motion.span>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.1, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="mt-5 font-display text-[12vw] leading-[0.95] font-medium text-balance sm:text-6xl md:text-7xl lg:text-[5rem]"
            >
              Коса, нокти и лице.<br /><em className="font-serif italic text-primary">В един салон, не в три.</em>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.55 }}
              className="mt-6 max-w-lg font-serif text-lg leading-relaxed italic text-foreground/80 md:text-xl"
            >
              Работим с професионални марки като Montibello, Goldwell и GIGI. Намираме се в кв. Левски, а час запазваш онлайн, по телефон или във Viber.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.8 }}
              className="mt-8 flex flex-wrap items-center gap-4"
            >
              <Button asChild size="lg" className="group h-13 rounded-full bg-foreground px-7 text-background hover:bg-primary">
                <Link href="/zapazi-chas">
                  <Calendar className="size-4" />
                  Запиши час
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Link href="#services" className="inline-flex items-center gap-3 font-medium text-foreground">
                <span className="grid size-11 place-items-center rounded-full border border-foreground/30 bg-background/60 backdrop-blur transition-colors hover:bg-mint">
                  <ArrowDown className="size-4" />
                </span>
                <span className="border-b border-foreground/30">Виж услугите</span>
              </Link>
            </motion.div>

            {/* Реален Google рейтинг — показва се само при налични отзиви (без fallback число) */}
            {rating && (
              <a
                href="https://www.google.com/search?q=Euphoria+Hair+Beauty+Bar+Varna"
                target="_blank"
                rel="noopener"
                className="mt-5 inline-flex items-center gap-2 text-sm text-foreground/80 transition-colors hover:text-foreground"
              >
                <span className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`size-3.5 ${i < Math.round(rating.value) ? "fill-foreground text-foreground" : "text-foreground/25"}`} />
                  ))}
                </span>
                <span className="font-medium">{rating.value.toFixed(1)}</span>
                <span className="text-muted-foreground">· {rating.count} отзива в Google</span>
              </a>
            )}

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 1.1 }}
              className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-foreground/10 pt-6"
            >
              <Stat label="Години зад стола" value="25+" />
              <Stat label="Открит салон" value="2023" />
              <Stat label="Партньорски марки" value="8" />
            </motion.div>
          </div>
        </div>

        {/* Долен info ред — над непрозрачната част на воала */}
        <div className="flex items-center gap-3 border-t border-foreground/10 pt-4 font-mono text-[11px] uppercase tracking-[0.2em] text-foreground/70">
          <span className={"relative grid size-2 place-items-center rounded-full " + (today.open ? "bg-mint" : "bg-foreground/30")}>
            {today.open && <span className="absolute inset-0 animate-ping rounded-full bg-mint" />}
          </span>
          {today.open ? "Днес отворено" : "Днес почиваме"}
          <span className="inline-flex items-center gap-1.5 text-foreground/50">
            <Clock className="size-3" /> {today.label}
          </span>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: boolean }) {
  return (
    <div>
      <div className="flex items-baseline gap-1.5">
        <span className="font-display text-3xl font-medium md:text-4xl">{value}</span>
        {icon && <Star className="size-3.5 fill-foreground text-foreground" />}
      </div>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
    </div>
  );
}
