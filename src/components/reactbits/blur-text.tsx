"use client";

import * as React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface BlurTextProps {
  text: string;
  className?: string;
  as?: "h1" | "h2" | "h3" | "p" | "span" | "div";
  delay?: number;
  stagger?: number;
  by?: "word" | "char";
}

/**
 * BlurText — text reveal с blur-to-focus ефект (react-bits inspired).
 * Анимира всяка дума или символ с лек stagger.
 */
export function BlurText({
  text,
  className,
  as: Tag = "h1",
  delay = 0,
  stagger = 0.05,
  by = "word",
}: BlurTextProps) {
  const segments = by === "word" ? text.split(/(\s+)/) : Array.from(text);

  return (
    <Tag className={cn("inline-block", className)}>
      {segments.map((segment, i) => {
        if (/^\s+$/.test(segment)) {
          return <span key={i}>{segment}</span>;
        }
        return (
          <motion.span
            key={i}
            initial={{ opacity: 0, filter: "blur(12px)", y: 12 }}
            animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
            transition={{
              duration: 0.7,
              delay: delay + i * stagger,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="inline-block"
          >
            {segment}
          </motion.span>
        );
      })}
    </Tag>
  );
}
