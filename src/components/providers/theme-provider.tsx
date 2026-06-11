"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { MotionConfig } from "motion/react";

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider {...props}>
      {/* reducedMotion="user" спира transform анимациите при системна настройка за
          намалено движение. Opacity/blur НЕ са transformProps в motion — те се
          гасят отделно с useReducedMotion в самите компоненти (Reveal/BlurText/SplitText). */}
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </NextThemesProvider>
  );
}
