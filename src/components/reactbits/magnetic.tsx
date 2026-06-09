"use client";

import * as React from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";

interface MagneticProps extends React.HTMLAttributes<HTMLDivElement> {
  strength?: number;
}

export function Magnetic({ children, strength = 0.35, ...props }: MagneticProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 200, damping: 18, mass: 0.5 });
  const springY = useSpring(y, { stiffness: 200, damping: 18, mass: 0.5 });
  const tx = useTransform(springX, (v) => `${v}px`);
  const ty = useTransform(springY, (v) => `${v}px`);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    x.set((e.clientX - cx) * strength);
    y.set((e.clientY - cy) * strength);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: tx, y: ty }}
      {...(props as React.ComponentProps<typeof motion.div>)}
    >
      {children}
    </motion.div>
  );
}
