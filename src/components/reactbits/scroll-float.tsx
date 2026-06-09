"use client";

import * as React from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { cn } from "@/lib/utils";

interface ScrollFloatProps {
  text: string;
  className?: string;
  as?: "h2" | "h3" | "p" | "div";
}

/**
 * ScrollFloat — буквите се изместват плавно нагоре докато потребителят скролира,
 * с лек stagger между тях. Безшумно editorial движение, не tech-y.
 */
export function ScrollFloat({ text, className, as: Tag = "h2" }: ScrollFloatProps) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 90%", "end 30%"],
  });

  const chars = Array.from(text);

  return (
    <Tag className={cn("inline-block", className)}>
      <span ref={ref} aria-label={text} className="inline-block">
        {chars.map((c, i) => (
          <Letter key={i} progress={scrollYProgress} index={i} total={chars.length}>
            {c}
          </Letter>
        ))}
      </span>
    </Tag>
  );
}

function Letter({
  children,
  progress,
  index,
  total,
}: {
  children: React.ReactNode;
  progress: ReturnType<typeof useScroll>["scrollYProgress"];
  index: number;
  total: number;
}) {
  const start = index / (total + 4);
  const end = start + 0.4;
  const y = useTransform(progress, [start, end], [40, 0]);
  const opacity = useTransform(progress, [start, end], [0, 1]);

  return (
    <motion.span aria-hidden style={{ y, opacity }} className="inline-block whitespace-pre">
      {children}
    </motion.span>
  );
}
