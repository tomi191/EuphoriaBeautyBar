"use client";

import * as React from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { cn } from "@/lib/utils";

interface TiltedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  rotateAmplitude?: number;
  scaleOnHover?: number;
}

/**
 * TiltedCard — 3D perspective tilt that follows the cursor.
 * Adapted from react-bits TiltedCard.
 */
export function TiltedCard({
  children,
  className,
  rotateAmplitude = 12,
  scaleOnHover = 1.04,
  ...props
}: TiltedCardProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scale = useMotionValue(1);

  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [rotateAmplitude, -rotateAmplitude]), {
    stiffness: 200,
    damping: 18,
  });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-rotateAmplitude, rotateAmplitude]), {
    stiffness: 200,
    damping: 18,
  });
  const springScale = useSpring(scale, { stiffness: 200, damping: 18 });

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  }

  return (
    <motion.div
      onMouseEnter={() => scale.set(scaleOnHover)}
      onMouseLeave={() => {
        scale.set(1);
        x.set(0);
        y.set(0);
      }}
      onMouseMove={handleMouseMove}
      style={{ rotateX, rotateY, scale: springScale, transformPerspective: 1000 }}
      className={cn("[transform-style:preserve-3d]", className)}
      {...(props as React.ComponentProps<typeof motion.div>)}
    >
      {children}
    </motion.div>
  );
}
