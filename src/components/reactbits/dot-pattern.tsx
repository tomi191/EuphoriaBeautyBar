import { cn } from "@/lib/utils";

interface DotPatternProps {
  className?: string;
  size?: number;
  spacing?: number;
  color?: string;
  fade?: "radial" | "top" | "bottom" | "none";
}

/**
 * DotPattern — subtle SVG dot grid background. Lightweight, runs on the server.
 */
export function DotPattern({
  className,
  size = 1,
  spacing = 24,
  color = "currentColor",
  fade = "radial",
}: DotPatternProps) {
  const maskImage = {
    radial: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
    top: "linear-gradient(to bottom, black, transparent)",
    bottom: "linear-gradient(to top, black, transparent)",
    none: undefined,
  }[fade];

  return (
    <svg
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 h-full w-full text-foreground/20", className)}
      style={maskImage ? { maskImage, WebkitMaskImage: maskImage } : undefined}
    >
      <defs>
        <pattern id="dots" x="0" y="0" width={spacing} height={spacing} patternUnits="userSpaceOnUse">
          <circle cx={spacing / 2} cy={spacing / 2} r={size} fill={color} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#dots)" />
    </svg>
  );
}
