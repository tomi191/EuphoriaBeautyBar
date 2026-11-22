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

// Обявата, телефон (посока-Б-390.png): линията от горната лента прави извивка към десния ръб и
// влиза в арката. Арката на телефон е с border-radius (расте на височина до лентата, без да се
// изкривява), затова тук е само линията; виж ListingMobileLine.
const LISTING_MOBILE_LINE: Cmd[] = [
  ["M", -900, 0.75], ["L", 172, 0.75], ["C", 228, 0.75, 262, 30, 262, 80], ["C", 262, 140, 236, 175, 206, 190], ["C", 190, 198, 184, 212, 184, 228],
];

// Обявата, компютър (Б-обява-1440.png): дясната колона, линията слиза от горната лента в
// широката извивка на арката. Правите страни са по-дълги от кадъра (860 вместо 800): долният
// край на арката е на нивото на долния край на бутоните и с реда за започващите (кривите са същите).
const LISTING_DESKTOP: Shape = {
  vb: [785, 860],
  img: [58, 14, 770, 848],
  clip: [["M", 78, 848], ["Q", 58, 848, 58, 828], ["L", 58, 430], ["C", 58, 240, 200, 14, 450, 14], ["L", 680, 14], ["Q", 770, 14, 770, 104], ["L", 770, 828], ["Q", 770, 848, 750, 848], ["Z"]],
  lines: [
    [["M", 70, 859], ["Q", 47, 859, 47, 836], ["L", 47, 430], ["C", 47, 232, 194, 3, 450, 3], ["L", 680, 3], ["Q", 781, 3, 781, 104], ["L", 781, 836], ["Q", 781, 859, 758, 859], ["Z"]],
    [["M", -1400, 0.75], ["L", 0, 0.75], ["C", 75, 0.75, 144, 148, 174.1, 118.4]],
  ],
};

// Списъкът, компютър (Б-списък-1440.png): общ кадър на салона, линията от горната лента слиза по
// десния край на арката.
const LIST_DESKTOP: Shape = {
  vb: [900, 1200],
  img: [38, 83, 880, 1200],
  clip: [["M", 38, 1200], ["L", 38, 520], ["C", 38, 262, 262, 83, 520, 83], ["L", 600, 83], ["C", 760, 83, 880, 200, 880, 330], ["L", 880, 1200], ["Z"]],
  lines: [
    [["M", 25, 1200], ["L", 25, 520], ["C", 25, 252, 256, 70, 520, 70], ["L", 600, 70], ["C", 770, 70, 895, 192, 895, 330], ["L", 895, 1200]],
    [["M", -1400, 0.75], ["L", 560, 0.75], ["C", 770, 0.75, 895, 130, 895, 300]],
  ],
};

const SHAPES = { listingDesktop: LISTING_DESKTOP, listDesktop: LIST_DESKTOP };
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

/**
 * Обявата: една снимка, формата се сменя на lg. На телефон височината идва от реда на мрежата
 * (арката стига до долната лента), а формата е border-radius; на компютър: дясна колона с
 * пропорцията на кадъра и рязане по кривата.
 */
export function ListingArchFigure({ src, alt, priority, className }: FigureProps) {
  return (
    <div className={cn("relative lg:aspect-[785/860]", className)}>
      <ClipDefs names={["listingDesktop"]} />
      <div
        className={cn(
          "absolute inset-x-1 top-1 bottom-0 overflow-hidden rounded-tl-[52%_30vw] rounded-tr-[7vw]",
          "lg:inset-auto lg:left-[7.389%] lg:top-[1.628%] lg:h-[96.977%] lg:w-[90.701%] lg:overflow-visible lg:rounded-none lg:[clip-path:url(#arch-listingDesktop)]",
        )}
      >
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes="(min-width: 1024px) 640px, 72vw"
          className="object-cover"
        />
      </div>
      {/* Рамката около снимката на телефон: 4 px от нея, без долна страна (снимката слиза под лентата). */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-tl-[calc(52%+4px)_calc(30vw+4px)] rounded-tr-[calc(7vw+4px)] border-[1.5px] border-b-0 border-primary/55 lg:hidden"
      />
      <Lines shape={LISTING_DESKTOP} className="hidden lg:block" />
    </div>
  );
}

/**
 * Обявата на телефон: линията от долния ръб на горната лента до горния край на арката. Стои в
 * първия ред на мрежата (до текста) и се разтяга с височината му (preserveAspectRatio="none").
 */
export function ListingMobileLine({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 270 228"
      preserveAspectRatio="none"
      className={cn("pointer-events-none overflow-visible text-primary/55", className)}
      fill="none"
    >
      <path d={path(LISTING_MOBILE_LINE)} stroke="currentColor" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Списъкът: само на компютър. */
export function ListArchFigure({ src, alt, priority, className }: FigureProps) {
  return (
    <div className={cn("relative aspect-[900/1200]", className)}>
      <ClipDefs names={["listDesktop"]} />
      <div className="absolute left-[4.222%] top-[6.917%] h-[93.083%] w-[93.556%] [clip-path:url(#arch-listDesktop)]">
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
