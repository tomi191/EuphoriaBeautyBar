"use client";

import * as React from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

interface RevealProps extends React.HTMLAttributes<HTMLDivElement> {
  delay?: number;
  duration?: number;
  y?: number;
  once?: boolean;
}

export function Reveal({
  children,
  className,
  delay = 0,
  duration = 0.7,
  y = 24,
  once = true,
  ...props
}: RevealProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once, margin: "-15% 0px" });
  const reduce = useReducedMotion();

  // При намалено движение: без opacity/translate анимация — рендирай финалното състояние.
  const hidden = reduce ? { opacity: 1, y: 0 } : { opacity: 0, y };
  const shown = { opacity: 1, y: 0 };

  return (
    <motion.div
      ref={ref}
      initial={hidden}
      animate={inView ? shown : hidden}
      transition={reduce ? { duration: 0 } : { duration, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn(className)}
      {...(props as React.ComponentProps<typeof motion.div>)}
    >
      {children}
    </motion.div>
  );
}
