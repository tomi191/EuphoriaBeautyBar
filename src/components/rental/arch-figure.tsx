import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Снимката в извитата рамка с линията от логото (кадрите «Бар меню», визия №12).
 *
 * Всяка форма е описана в координатите на своя кадър (viewBox): рамката на снимката, линията
 * около нея и линията, която тръгва от долния ръб на горната лента. Кутията на фигурата пази
 * пропорцията на viewBox-а, затова линиите се мащабират равномерно; снимката се реже със същата
 * форма, преведена в 0..1 спрямо своя правоъгълник (clipPathUnits="objectBoundingBox").
 * Фигурата стои в горния край на секцията: y = 0 е долният ръб на горната лента.
 */
type Cmd = [string, ...number[]];

interface Shape {
  vb: [number, number];
  /** Правоъгълникът на снимката: x0, y0, x1, y1. */
  img: [number, number, number, number];
  clip: Cmd[];
  lines: Cmd[][];
}

function path(cmds: Cmd[], fx: (x: number) => number = (x) => x, fy: (y: number) => number = (y) => y) {
  return cmds
    .map(([c, ...n]) => c + n.map((v, i) => +(i % 2 === 0 ? fx(v) : fy(v)).toFixed(4)).join(" "))
    .join(" ");
}

function clipPath(s: Shape) {
  const [x0, y0, x1, y1] = s.img;
  return path(
    s.clip,
    (x) => (x - x0) / (x1 - x0),
    (y) => (y - y0) / (y1 - y0),
  );
}

// Обявата, телефон (посока-Б-390.png): снимката долу вдясно, линията прави извивка към десния
// ръб и влиза в арката.
const LISTING_MOBILE: Shape = {
  // Арката е по-ниско от кадъра (там телефонът е къс): курсивът и адресът стоят вляво над нея.
  vb: [270, 500],
  img: [0, 236, 257, 500],
  clip: [["M", 0, 500], ["L", 0, 345], ["C", 0, 280, 55, 236, 120, 236], ["L", 224, 236], ["Q", 257, 236, 257, 269], ["L", 257, 500], ["Z"]],
  lines: [
    [["M", -8, 500], ["L", -8, 345], ["C", -8, 272, 50, 228, 120, 228], ["L", 224, 228], ["Q", 265, 228, 265, 269], ["L", 265, 500]],
    [["M", -900, 0.75], ["L", 172, 0.75], ["C", 228, 0.75, 262, 30, 262, 80], ["C", 262, 140, 236, 175, 206, 190], ["C", 190, 198, 184, 212, 184, 228]],
  ],
};

// Обявата, компютър (Б-обява-1440.png): дясната колона, линията слиза от горната лента в
// широката извивка на арката.
const LISTING_DESKTOP: Shape = {
  vb: [785, 800],
  img: [58, 14, 770, 788],
  clip: [["M", 78, 788], ["Q", 58, 788, 58, 768], ["L", 58, 430], ["C", 58, 240, 200, 14, 450, 14], ["L", 680, 14], ["Q", 770, 14, 770, 104], ["L", 770, 768], ["Q", 770, 788, 750, 788], ["Z"]],
  lines: [
    [["M", 70, 799], ["Q", 47, 799, 47, 776], ["L", 47, 430], ["C", 47, 232, 194, 3, 450, 3], ["L", 680, 3], ["Q", 781, 3, 781, 104], ["L", 781, 776], ["Q", 781, 799, 758, 799], ["Z"]],
    [["M", -1400, 0.75], ["L", 0, 0.75], ["C", 75, 0.75, 144, 148, 174.1, 118.4]],
  ],
};

// Списъкът, компютър (Б-списък-1440.png): общ кадър на салона, линията от горната лента слиза по
// десния край на арката.
const LIST_DESKTOP: Shape = {
  vb: [900, 1043],
  img: [38, 83, 880, 1043],
  clip: [["M", 38, 1043], ["L", 38, 520], ["C", 38, 262, 262, 83, 520, 83], ["L", 600, 83], ["C", 760, 83, 880, 200, 880, 330], ["L", 880, 1043], ["Z"]],
  lines: [
    [["M", 25, 1043], ["L", 25, 520], ["C", 25, 252, 256, 70, 520, 70], ["L", 600, 70], ["C", 770, 70, 895, 192, 895, 330], ["L", 895, 1043]],
    [["M", -1400, 0.75], ["L", 560, 0.75], ["C", 770, 0.75, 895, 130, 895, 300]],
  ],
};

const SHAPES = { listingMobile: LISTING_MOBILE, listingDesktop: LISTING_DESKTOP, listDesktop: LIST_DESKTOP };
type ShapeName = keyof typeof SHAPES;

function Lines({ shape, className }: { shape: Shape; className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${shape.vb[0]} ${shape.vb[1]}`}
      className={cn("pointer-events-none absolute inset-0 h-full w-full overflow-visible text-primary/55", className)}
      fill="none"
    >
      {shape.lines.map((l, i) => (
        <path key={i} d={path(l)} stroke="currentColor" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}

/** Скритите форми за рязане на снимката (една SVG на страница е достатъчна). */
function ClipDefs({ names }: { names: ShapeName[] }) {
  return (
    <svg aria-hidden width="0" height="0" className="absolute">
      <defs>
        {names.map((n) => (
          <clipPath key={n} id={`arch-${n}`} clipPathUnits="objectBoundingBox">
            <path d={clipPath(SHAPES[n])} />
          </clipPath>
        ))}
      </defs>
    </svg>
  );
}

interface FigureProps {
  src: string;
  alt: string;
  priority?: boolean;
  className?: string;
}

/** Обявата: една снимка, формата се сменя на lg (на телефон долу вдясно, на компютър дясна колона). */
export function ListingArchFigure({ src, alt, priority, className }: FigureProps) {
  return (
    <div className={cn("relative aspect-[270/500] lg:aspect-[785/800]", className)}>
      <ClipDefs names={["listingMobile", "listingDesktop"]} />
      <div
        className={cn(
          "absolute left-0 top-[47.2%] h-[52.8%] w-[95.185%] [clip-path:url(#arch-listingMobile)]",
          "lg:left-[7.389%] lg:top-[1.75%] lg:h-[96.75%] lg:w-[90.701%] lg:[clip-path:url(#arch-listingDesktop)]",
        )}
      >
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes="(min-width: 1024px) 640px, 70vw"
          className="object-cover"
        />
      </div>
      <Lines shape={LISTING_MOBILE} className="lg:hidden" />
      <Lines shape={LISTING_DESKTOP} className="hidden lg:block" />
    </div>
  );
}

/** Списъкът: само на компютър. */
export function ListArchFigure({ src, alt, priority, className }: FigureProps) {
  return (
    <div className={cn("relative aspect-[900/1043]", className)}>
      <ClipDefs names={["listDesktop"]} />
      <div className="absolute left-[4.222%] top-[7.958%] h-[92.042%] w-[93.556%] [clip-path:url(#arch-listDesktop)]">
        <Image src={src} alt={alt} fill priority={priority} sizes="560px" className="object-cover" />
      </div>
      <Lines shape={LIST_DESKTOP} />
    </div>
  );
}

/** Списъкът на телефон: само линията от горната лента, която слиза към десния ръб. */
export function ListMobileLine({ className }: { className?: string }) {
  const shape: Shape = {
    vb: [300, 213],
    img: [0, 0, 1, 1],
    clip: [],
    lines: [[["M", -900, 0.75], ["L", 0, 0.75], ["C", 170, 0.75, 300, 92, 300, 213]]],
  };
  return (
    <div className={cn("pointer-events-none absolute right-0 top-0 aspect-[300/213] w-[30%]", className)}>
      <Lines shape={shape} />
    </div>
  );
}
