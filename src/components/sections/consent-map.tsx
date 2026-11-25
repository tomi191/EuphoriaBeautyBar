"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Map as MapIcon, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/lib/site";

/**
 * Картата на Google се зарежда само след натискане (ePrivacy чл. 5(3): Google слага бисквитки).
 * Дотогава стои наш чертеж от данните на OpenStreetMap (ODbL, указанието е връзка долу вдясно).
 * Изборът не се помни: важи само за тази страница, докато е отворена.
 */
type Plan = { src: string; src2x: string; w: number; h: number; pos: string };

const PLAN_SM: Plan = { src: "/images/map/plan-sm.webp", src2x: "/images/map/plan-sm@2x.webp", w: 358, h: 188, pos: "56% 52%" };
const PLAN_MD: Plan = { src: "/images/map/plan-md.webp", src2x: "/images/map/plan-md@2x.webp", w: 760, h: 230, pos: "56% 52%" };

export const MAP_PLANS = {
  levski: { src: "/images/map/levski-lg.webp", src2x: "/images/map/levski-lg@2x.webp", w: 689, h: 625, pos: "62% 38%" },
  contacts: { src: "/images/map/contacts-lg.webp", src2x: "/images/map/contacts-lg@2x.webp", w: 1216, h: 684, pos: "60% 45%" },
} satisfies Record<string, Plan>;

const EMBED_SRC = `https://www.google.com/maps?q=${encodeURIComponent(siteConfig.address.full)}&output=embed`;
const NBSP = String.fromCharCode(160);

export function ConsentMap({
  plan,
  title,
  frameClassName,
  className,
}: {
  plan: keyof typeof MAP_PLANS;
  /** title на iframe след натискането (същият като досега) */
  title: string;
  /** класовете на кутията с картата на Google (днешният размер) */
  frameClassName: string;
  /** кутията преди натискането: радиус и височина на широк екран */
  className?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const lg = MAP_PLANS[plan];

  useEffect(() => {
    if (loaded) frameRef.current?.focus();
  }, [loaded]);

  if (loaded) {
    return (
      <div className={frameClassName}>
        <iframe
          ref={frameRef}
          title={title}
          src={EMBED_SRC}
          className="h-full min-h-[inherit] w-full"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden border border-border bg-card", className)}>
      <div className="relative lg:absolute lg:inset-0">
        <picture className="block h-full">
          <source media="(min-width: 1024px)" srcSet={`${lg.src} 1x, ${lg.src2x} 2x`} width={lg.w} height={lg.h} />
          <source media="(min-width: 640px)" srcSet={`${PLAN_MD.src} 1x, ${PLAN_MD.src2x} 2x`} width={PLAN_MD.w} height={PLAN_MD.h} />
          {/* eslint-disable-next-line @next/next/no-img-element -- статичен чертеж, различен по ширина (art direction) */}
          <img
            src={PLAN_SM.src}
            srcSet={`${PLAN_SM.src2x} 2x`}
            width={PLAN_SM.w}
            height={PLAN_SM.h}
            alt="План на кв. Левски: салонът е на ул. Петър Райчев 18"
            loading="lazy"
            decoding="async"
            className="block aspect-[358/188] h-auto w-full object-cover sm:aspect-[760/230] lg:aspect-auto lg:h-full [object-position:var(--pos-sm)] lg:[object-position:var(--pos-lg)]"
            style={{ ["--pos-sm" as string]: PLAN_SM.pos, ["--pos-lg" as string]: lg.pos }}
          />
        </picture>
        <p className="absolute bottom-0 right-0 bg-card/[0.88] px-1.5 py-0.5 text-[11px] leading-[16px] text-muted-foreground">
          Данни ©{" "}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          >
            OpenStreetMap
          </a>
        </p>
      </div>

      <div className="border-t border-border bg-card px-4 pt-4 pb-1 lg:absolute lg:bottom-4 lg:left-4 lg:w-[360px] lg:rounded-xl lg:border lg:px-5 lg:pt-5 lg:pb-1 lg:shadow-[0_4px_20px_rgba(17,17,22,0.10)]">
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-mint text-foreground">
            <MapPin className="size-[22px]" aria-hidden />
          </span>
          <p className="min-w-0">
            <span className="block text-[17px] font-semibold leading-[23px] text-foreground">ул. Петър Райчев 18</span>
            <span className="block text-[15px] leading-[20px] text-muted-foreground">кв. Левски, Варна</span>
          </p>
        </div>

        <button
          type="button"
          onClick={() => setLoaded(true)}
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full border-[1.5px] border-foreground bg-card text-[14px] font-medium text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <MapIcon className="size-[18px]" aria-hidden />
          Покажи картата в Google
        </button>
        <p className="mt-2 text-[13px] leading-[19px] text-muted-foreground">
          {`С${NBSP}натискането Google зарежда картата и${NBSP}слага свои бисквитки.`}
        </p>

        <a
          href={siteConfig.address.mapsUrl}
          target="_blank"
          rel="noopener"
          className="mt-0.5 inline-flex h-12 items-center gap-1.5 text-[14px] font-medium text-primary"
        >
          <span className="underline decoration-1 underline-offset-[6px]">Отвори в Google Maps</span>
          <ExternalLink className="size-4" aria-hidden />
          <span className="sr-only">(отваря се в нов прозорец)</span>
        </a>
      </div>
    </div>
  );
}
