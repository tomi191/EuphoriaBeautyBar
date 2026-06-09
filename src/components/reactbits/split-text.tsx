"use client";

import * as React from "react";
import { motion, useInView } from "motion/react";
import { cn } from "@/lib/utils";

interface SplitTextProps {
  text: string;
  as?: "h1" | "h2" | "h3" | "p" | "span" | "div";
  className?: string;
  delay?: number;
  stagger?: number;
}

/**
 * SplitText — character-level reveal animation. Triggers when scrolled into view.
 * Adapted from react-bits SplitText.
 */
export function SplitText({ text, as: Tag = "h2", className, delay = 0, stagger = 0.025 }: SplitTextProps) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const words = text.split(/(\s+)/);

  return (
    <Tag className={cn("inline-block", className)}>
      <span ref={ref} aria-label={text} className="inline-block">
        {words.map((word, wi) => (
          <span key={wi} className="inline-block whitespace-pre">
            {Array.from(word).map((char, ci) => (
              <motion.span
                key={`${wi}-${ci}`}
                aria-hidden
                className="inline-block"
                initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
                animate={inView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
                transition={{
                  duration: 0.55,
                  delay: delay + (wi + ci) * stagger,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                {char}
              </motion.span>
            ))}
          </span>
        ))}
      </span>
    </Tag>
  );
}
