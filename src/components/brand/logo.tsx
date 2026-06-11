import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  variant?: "auto" | "black" | "white" | "mark";
  width?: number;
  height?: number;
  href?: string | null;
}

/**
 * Logo — два варианта:
 *  - black (с черни линии и pastel sage/blush) → светъл фон
 *  - white (с бели линии и наситени purple/pink) → тъмен фон
 *
 * `variant="auto"` (default) сменя автоматично спрямо theme — black image е
 * скрит в dark mode и обратното. По този начин не зависим от CSS филтри
 * и запазваме оригиналните pastel цветове на логото във всяка тема.
 */
export function Logo({ className, variant = "auto", width = 160, height = 48, href = "/" }: LogoProps) {
  if (variant === "mark") {
    const inner = (
      <Image
        src="/images/brand/logo-mark.png"
        alt="Euphoria Hair & Beauty Bar"
        width={width}
        height={height}
        className={cn("h-auto w-auto select-none object-contain", className)}
      />
    );
    return href ? (
      <Link href={href} aria-label="Euphoria — начало" className="inline-flex items-center">
        {inner}
      </Link>
    ) : (
      inner
    );
  }

  const sharedClasses = cn("h-auto w-auto select-none object-contain", className);

  const inner =
    variant === "auto" ? (
      <span className="relative inline-flex items-center">
        <Image
          src="/images/brand/logo-black.png"
          alt="Euphoria Hair & Beauty Bar"
          width={width}
          height={height}
          // БЕЗ priority/eager: в Next 16 и двете емитват <link rel=preload>,
          // а 8KB лого няма работа в LCP опашката преди hero снимката.
          className={cn(sharedClasses, "block dark:hidden")}
        />
        <Image
          src="/images/brand/logo-white.png"
          alt="Euphoria Hair & Beauty Bar"
          width={width}
          height={height}
          className={cn(sharedClasses, "hidden dark:block")}
          aria-hidden
        />
      </span>
    ) : (
      <Image
        src={`/images/brand/logo-${variant}.png`}
        alt="Euphoria Hair & Beauty Bar"
        width={width}
        height={height}
        className={sharedClasses}
      />
    );

  return href ? (
    <Link href={href} aria-label="Euphoria — начало" className="inline-flex items-center">
      {inner}
    </Link>
  ) : (
    inner
  );
}
