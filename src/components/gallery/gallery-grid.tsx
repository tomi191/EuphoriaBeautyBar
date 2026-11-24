"use client";

import * as React from "react";
import Link from "next/link";
import { Dialog as DialogPrimitive } from "radix-ui";
import { ArrowRight, ChevronLeft, ChevronRight, X } from "lucide-react";
import { galleryCategories, type GalleryCategory } from "@/lib/data/gallery";
import { galleryThumbSrc, THUMB_WIDTH } from "@/lib/gallery/thumb";
import { cn } from "@/lib/utils";

/** Какво пише до отворената снимка: услугата (или видът работа) и къде водят бутоните. */
export interface GalleryLinkInfo {
  kicker: string | null;
  name: string;
  bookHref: string;
  bookLabel: string;
  pageHref: string;
  pageLabel: string;
}

/** Формата, в която решетката очаква снимка (редът от базата плюс връзките към услугата). */
export interface GalleryDisplayImage {
  id: string;
  src: string;
  alt: string;
  category: string;
  width: number;
  height: number;
  description?: string | null;
  info: GalleryLinkInfo;
}

interface GalleryGridProps {
  images: GalleryDisplayImage[];
}

// Редът на филтрите по кадъра (визия №32). Вид с по-малко от 4 снимки не се показва като филтър.
const FILTER_ORDER: GalleryCategory[] = [
  "all",
  "boyadisvane",
  "pricheski",
  "svatbeni",
  "podstrigvane",
  "manikyur",
  "grim",
];
const MIN_PER_FILTER = 4;
const FILTER_PARAM = "vid";

const focusRing =
  "focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none";

export function GalleryGrid({ images }: GalleryGridProps) {
  const [filter, setFilter] = React.useState<GalleryCategory>("all");
  const [index, setIndex] = React.useState<number | null>(null);
  const [stuck, setStuck] = React.useState(false);
  const tileRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const lastIndex = React.useRef(0);
  const sentinel = React.useRef<HTMLDivElement>(null);
  const swipe = React.useRef<{ x: number; y: number } | null>(null);

  const filters = React.useMemo(
    () =>
      FILTER_ORDER.filter(
        (v) =>
          v === "all" ||
          images.filter((img) => img.category === v).length >= MIN_PER_FILTER,
      ).map((v) => galleryCategories.find((c) => c.value === v)!),
    [images],
  );

  const filtered = React.useMemo(
    () =>
      filter === "all"
        ? images
        : images.filter((img) => img.category === filter),
    [filter, images],
  );

  // Филтърът е в адреса (?vid=boyadisvane), за да може изгледът да се сподели.
  React.useEffect(() => {
    const v = new URLSearchParams(window.location.search).get(FILTER_PARAM);
    if (v && filters.some((f) => f.value === v))
      setFilter(v as GalleryCategory);
  }, [filters]);

  function chooseFilter(v: GalleryCategory) {
    setFilter(v);
    const url = new URL(window.location.href);
    if (v === "all") url.searchParams.delete(FILTER_PARAM);
    else url.searchParams.set(FILTER_PARAM, v);
    window.history.replaceState(window.history.state, "", url);
  }

  // Лентата с филтрите се залепва под заглавната (на телефон); линията отдолу е само тогава.
  React.useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setStuck(!e.isIntersecting), {
      rootMargin: "-80px 0px 0px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const count = filtered.length;
  const active = index !== null ? (filtered[index] ?? null) : null;

  const step = React.useCallback(
    (d: number) =>
      setIndex((i) =>
        i === null || count === 0 ? i : (i + d + count) % count,
      ),
    [count],
  );

  // Съседните снимки се теглят предварително: листането не чака мрежата.
  React.useEffect(() => {
    if (index === null) return;
    lastIndex.current = index;
    if (count < 2) return;
    for (const d of [1, -1])
      new window.Image().src = filtered[(index + d + count) % count].src;
  }, [index, count, filtered]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      step(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      step(-1);
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    const s = swipe.current;
    swipe.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
  }

  return (
    <>
      {/* Обвивката свършва с решетката: залепената лента с филтрите не стои над призива отдолу. */}
      <div>
        <div ref={sentinel} aria-hidden className="h-0" />
        <div
          data-stuck={stuck}
          className="sticky top-20 z-30 -mx-4 mt-3 bg-background py-2 data-[stuck=true]:shadow-[0_1px_0_var(--border)] lg:static lg:mx-0 lg:mt-[30px] lg:py-0 lg:shadow-none lg:data-[stuck=true]:shadow-none"
        >
          <div
            role="group"
            aria-label="Вид работа"
            className="flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] lg:px-0 [&::-webkit-scrollbar]:hidden"
          >
            {filters.map((cat) => {
              const isActive = filter === cat.value;
              return (
                <button
                  key={cat.value}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => chooseFilter(cat.value)}
                  className={cn(
                    "h-11 shrink-0 cursor-pointer rounded-full border px-4 text-[15px] font-medium transition-colors",
                    focusRing,
                    isActive
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground hover:border-foreground/30",
                  )}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 lg:mt-8 lg:grid-cols-4 lg:gap-4">
          {filtered.map((img, i) => (
            <button
              key={img.id}
              ref={(el) => {
                tileRefs.current[i] = el;
              }}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Отвори снимка ${i + 1} от ${count}`}
              className={cn(
                "relative block aspect-[4/5] w-full cursor-pointer overflow-hidden rounded-2xl bg-secondary/50",
                focusRing,
              )}
            >
              <TileImage img={img} eager={i < 4} />
            </button>
          ))}
        </div>
      </div>

      <DialogPrimitive.Root
        open={active !== null}
        onOpenChange={(o) => !o && setIndex(null)}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Content
            aria-describedby={undefined}
            onKeyDown={onKeyDown}
            onCloseAutoFocus={(e) => {
              // Фокусът се връща на плочката на последната гледана снимка.
              e.preventDefault();
              tileRefs.current[lastIndex.current]?.focus();
            }}
            className="fixed inset-0 z-[60] overflow-y-auto overscroll-contain bg-background outline-none motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:fade-in motion-safe:data-[state=open]:zoom-in-98 motion-safe:data-[state=open]:animation-duration-180 motion-safe:data-[state=open]:ease-[cubic-bezier(0.22,1,0.36,1)]"
          >
            {active && (
              <div className="flex min-h-dvh flex-col lg:h-dvh">
                <div className="flex h-14 shrink-0 items-center justify-between px-4 lg:h-[72px] lg:px-12">
                  <span
                    aria-live="polite"
                    className="text-[15px] font-medium tabular-nums"
                  >
                    {index! + 1} от {count}
                  </span>
                  <DialogPrimitive.Close
                    aria-label="Затвори"
                    className={cn(
                      "grid size-11 cursor-pointer place-items-center rounded-full border border-border bg-card lg:size-12",
                      focusRing,
                    )}
                  >
                    <X className="size-5" strokeWidth={1.75} />
                  </DialogPrimitive.Close>
                </div>

                <div className="flex flex-col lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_352px] lg:gap-10 lg:px-12 lg:pb-12">
                  <div
                    onPointerDown={(e) =>
                      (swipe.current = { x: e.clientX, y: e.clientY })
                    }
                    onPointerUp={onPointerUp}
                    onPointerCancel={() => (swipe.current = null)}
                    className="relative flex h-[min(520px,calc(100dvh-324px))] min-h-[300px] w-full touch-pan-y items-center justify-center bg-[#f1ebe2] select-none dark:bg-secondary lg:h-full lg:min-h-0 lg:bg-transparent dark:lg:bg-transparent"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      key={active.id}
                      src={active.src}
                      alt={active.alt}
                      width={active.width}
                      height={active.height}
                      draggable={false}
                      className="h-auto max-h-full w-auto max-w-full object-contain motion-safe:animate-in motion-safe:fade-in motion-safe:animation-duration-120 lg:rounded-xl"
                    />
                    <ViewerArrow
                      dir={-1}
                      onClick={() => step(-1)}
                      className="absolute top-1/2 left-4 hidden size-12 -translate-y-1/2 lg:grid"
                    />
                    <ViewerArrow
                      dir={1}
                      onClick={() => step(1)}
                      className="absolute top-1/2 right-4 hidden size-12 -translate-y-1/2 lg:grid"
                    />
                  </div>

                  <div className="px-4 pt-5 pb-10 lg:flex lg:flex-col lg:justify-center lg:p-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        {active.info.kicker && (
                          <p className="text-[13px] font-medium text-primary lg:text-sm">
                            {active.info.kicker}
                          </p>
                        )}
                        <DialogPrimitive.Title className="font-display text-[26px] leading-tight font-medium lg:text-[40px]">
                          {active.info.name}
                        </DialogPrimitive.Title>
                      </div>
                      <div className="flex shrink-0 gap-2 lg:hidden">
                        <ViewerArrow
                          dir={-1}
                          onClick={() => step(-1)}
                          className="grid size-11"
                        />
                        <ViewerArrow
                          dir={1}
                          onClick={() => step(1)}
                          className="grid size-11"
                        />
                      </div>
                    </div>
                    {active.description && (
                      <p className="mt-1.5 text-[15px] leading-[22px] text-muted-foreground lg:mt-3 lg:text-[17px] lg:leading-[27px]">
                        {active.description}
                      </p>
                    )}
                    <Link
                      href={active.info.bookHref}
                      className={cn(
                        "mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3 text-center text-[15px] font-medium text-background lg:mt-6 lg:w-auto lg:self-start",
                        focusRing,
                      )}
                    >
                      {active.info.bookLabel}
                      <ArrowRight className="size-4 shrink-0" />
                    </Link>
                    <Link
                      href={active.info.pageHref}
                      className="mt-6 inline-flex items-center gap-1.5 text-[15px] font-medium text-primary underline underline-offset-4 lg:mt-5 lg:self-start"
                    >
                      {active.info.pageLabel}
                      <ArrowRight className="size-4 shrink-0" />
                    </Link>
                    <p className="mt-8 hidden text-[13px] text-muted-foreground lg:block">
                      Стрелките на клавиатурата листат, Esc затваря.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}

function ViewerArrow({
  dir,
  onClick,
  className,
}: {
  dir: 1 | -1;
  onClick: () => void;
  className?: string;
}) {
  const Icon = dir === 1 ? ChevronRight : ChevronLeft;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === 1 ? "Следваща снимка" : "Предишна снимка"}
      className={cn(
        "cursor-pointer place-items-center rounded-full border border-border bg-card text-foreground",
        focusRing,
        className,
      )}
    >
      <Icon className="size-5" strokeWidth={1.75} />
    </button>
  );
}

/**
 * Плочката тегли малкото копие (600 px). Ако го няма (стара снимка преди скрипта за
 * размерите), пада на голямата, вместо да остане празна.
 */
function TileImage({
  img,
  eager,
}: {
  img: GalleryDisplayImage;
  eager: boolean;
}) {
  const thumb = galleryThumbSrc(img.src);
  const ref = React.useRef<HTMLImageElement>(null);

  const showFull = React.useCallback(
    (el: HTMLImageElement) => {
      if (el.dataset.full) return;
      el.dataset.full = "1";
      el.removeAttribute("srcset");
      el.src = img.src;
    },
    [img.src],
  );

  // Грешка преди хидратацията не стига до onError: проверка при монтиране.
  React.useEffect(() => {
    const el = ref.current;
    if (el && thumb && el.complete && el.currentSrc && el.naturalWidth === 0)
      showFull(el);
  }, [thumb, showFull]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={thumb ?? img.src}
      srcSet={
        thumb ? `${thumb} ${THUMB_WIDTH}w, ${img.src} ${img.width}w` : undefined
      }
      sizes="(min-width: 1024px) 292px, calc(50vw - 22px)"
      alt={img.alt}
      width={img.width}
      height={img.height}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onError={(e) => thumb && showFull(e.currentTarget)}
      className="absolute inset-0 size-full object-cover object-[50%_30%]"
    />
  );
}
