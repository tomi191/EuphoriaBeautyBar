"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface GooeyBlobsProps {
  className?: string;
  intensity?: "subtle" | "medium";
}

/**
 * GooeyBlobs — плаващи pastel петна с liquid SVG filter. Имитира органичните
 * mint+blush петна от логото на Euphoria.
 */
export function GooeyBlobs({ className, intensity = "subtle" }: GooeyBlobsProps) {
  const opacity = intensity === "subtle" ? 0.45 : 0.7;
  return (
    <div className={cn("pointer-events-none absolute inset-0 -z-10 overflow-hidden", className)}>
      <svg className="absolute h-0 w-0">
        <defs>
          <filter id="gooey-eup">
            <feGaussianBlur in="SourceGraphic" stdDeviation="22" />
            <feColorMatrix
              type="matrix"
              values="1 0 0 0 0
                      0 1 0 0 0
                      0 0 1 0 0
                      0 0 0 22 -10"
            />
          </filter>
        </defs>
      </svg>
      <div className="absolute inset-0" style={{ filter: "url(#gooey-eup)" }}>
        <span
          className="absolute h-72 w-72 animate-blob-1 rounded-full"
          style={{ background: "var(--mint)", opacity, top: "12%", left: "8%" }}
        />
        <span
          className="absolute h-80 w-80 animate-blob-2 rounded-full"
          style={{ background: "var(--blush)", opacity, top: "35%", right: "8%" }}
        />
        <span
          className="absolute h-64 w-64 animate-blob-3 rounded-full"
          style={{ background: "var(--mint-soft)", opacity: opacity * 0.7, bottom: "15%", left: "30%" }}
        />
      </div>
    </div>
  );
}
