"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface AuroraBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {
  showRadialGradient?: boolean;
  intensity?: "subtle" | "soft" | "strong";
}

/**
 * Aurora — слой от gradient blob-ове в brand палитрата (purple deep + purple + mint).
 */
export function AuroraBackground({
  className,
  children,
  showRadialGradient = true,
  intensity = "soft",
  ...props
}: AuroraBackgroundProps) {
  const opacityMap = { subtle: "opacity-50", soft: "opacity-70", strong: "opacity-95" } as const;

  return (
    <div className={cn("relative isolate overflow-hidden", className)} {...props}>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 -z-10",
          opacityMap[intensity],
          showRadialGradient && "[mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]",
        )}
      >
        <div
          className="absolute -top-32 left-1/2 h-[44rem] w-[68rem] -translate-x-1/2 rounded-full opacity-40 blur-3xl animate-spin-slow"
          style={{
            backgroundImage:
              "conic-gradient(from 220deg at 50% 50%, var(--purple-deep), var(--purple), var(--mint), var(--purple-deep))",
          }}
        />
        <div
          className="absolute top-1/3 left-1/4 h-96 w-96 rounded-full opacity-30 blur-3xl animate-pulse"
          style={{ background: "var(--purple)", animationDuration: "9s" }}
        />
        <div
          className="absolute bottom-0 right-1/4 h-[28rem] w-[28rem] rounded-full opacity-25 blur-3xl animate-pulse"
          style={{ background: "var(--mint)", animationDuration: "11s", animationDelay: "2s" }}
        />
      </div>
      {children}
    </div>
  );
}
