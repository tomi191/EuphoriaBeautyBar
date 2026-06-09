import { cn } from "@/lib/utils";

/**
 * LineDivider — статичен брандов акцент между секции. Плавна непрекъсната
 * линия с мънисто на края — echo на логото на Euphoria (единият неотделен
 * щрих, завършващ с малката топка). Без анимация (решение от self-check:
 * нула scroll-jank на mobile).
 */
export function LineDivider({ className }: { className?: string }) {
  return (
    <div className={cn("flex justify-center py-10", className)} aria-hidden>
      <svg width="260" height="20" viewBox="0 0 260 20" fill="none" className="text-foreground/20">
        <path
          d="M4 10 C 44 0, 84 20, 124 10 S 204 0, 248 10"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="252" cy="10" r="3.5" className="fill-mint" />
      </svg>
    </div>
  );
}
