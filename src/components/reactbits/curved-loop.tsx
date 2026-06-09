"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface CurvedLoopProps {
  text: string;
  speed?: number;
  curveAmount?: number;
  className?: string;
  fontSize?: string;
  reverse?: boolean;
}

/**
 * CurvedLoop — текст следващ извита SVG path-ка, с infinite scroll анимация.
 * Inspired by react-bits CurvedLoop — beauty-friendly editorial елемент.
 */
export function CurvedLoop({
  text,
  speed = 60,
  curveAmount = 80,
  className,
  fontSize = "clamp(3rem, 8vw, 7rem)",
  reverse = false,
}: CurvedLoopProps) {
  const id = React.useId().replace(/:/g, "");
  const repeated = ` ${text} · `.repeat(6);

  return (
    <svg
      viewBox="0 0 1200 300"
      preserveAspectRatio="none"
      className={cn("h-full w-full overflow-visible", className)}
    >
      <defs>
        <path
          id={`curve-${id}`}
          d={`M -50 200 Q 600 ${200 - curveAmount} 1250 200`}
          fill="none"
        />
      </defs>
      <text
        fill="currentColor"
        style={{
          fontFamily: "var(--font-playfair), serif",
          fontSize,
          fontWeight: 500,
          letterSpacing: "-0.02em",
        }}
      >
        <textPath
          href={`#curve-${id}`}
          startOffset={reverse ? "100%" : "0%"}
        >
          <animate
            attributeName="startOffset"
            from={reverse ? "100%" : "0%"}
            to={reverse ? "0%" : "-100%"}
            dur={`${speed}s`}
            repeatCount="indefinite"
          />
          {repeated}
        </textPath>
      </text>
    </svg>
  );
}
