"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  spotlightColor?: string;
  spotlightSize?: number;
}

/**
 * SpotlightCard — radial spotlight follows mouse position.
 * Inspired by react-bits SpotlightCard / Aceternity SpotlightCard.
 */
export function SpotlightCard({
  className,
  children,
  spotlightColor = "var(--purple)",
  spotlightSize = 320,
  ...props
}: SpotlightCardProps) {
  const ref = React.useRef<HTMLDivElement>(null);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    node.style.setProperty("--spot-x", `${e.clientX - rect.left}px`);
    node.style.setProperty("--spot-y", `${e.clientY - rect.top}px`);
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      className={cn(
        "group/spot relative isolate overflow-hidden rounded-3xl border border-border/60 bg-card transition-colors",
        className,
      )}
      style={{
        ["--spot-color" as string]: spotlightColor,
        ["--spot-size" as string]: `${spotlightSize}px`,
      }}
      {...props}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-0 opacity-0 transition-opacity duration-500 group-hover/spot:opacity-100"
        style={{
          background:
            "radial-gradient(var(--spot-size) circle at var(--spot-x, 50%) var(--spot-y, 50%), color-mix(in oklch, var(--spot-color) 35%, transparent) 0%, transparent 70%)",
        }}
      />
      {children}
    </div>
  );
}
