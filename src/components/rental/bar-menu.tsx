import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Редът от «бар менюто» (визия №12): вляво текст, точки, вдясно курсив в основния цвят.
 * Без рамки и карти (бележката на Канопус за Б-обява-1440).
 */
export function MenuRow({ left, right, className }: { left: string; right: string; className?: string }) {
  return (
    <li className={cn("grid grid-cols-[auto_minmax(1.5rem,1fr)_auto] items-baseline gap-3", className)}>
      <span className="min-w-0">{left}</span>
      <span aria-hidden className="translate-y-[-0.2em] border-b-2 border-dotted border-foreground/25" />
      <span className="font-serif text-[1.3em] italic leading-none text-primary">{right}</span>
    </li>
  );
}

/** Ред от списъка, който води към обявата: целият ред е връзка, поне 56 px висок. */
export function MenuLinkRow({ href, left, right, label }: { href: string; left: string; right: string; label: string }) {
  const external = !href.startsWith("/");
  const content = (
    <>
      <span className="min-w-0">{left}</span>
      <span aria-hidden className="translate-y-[-0.2em] border-b-2 border-dotted border-foreground/25" />
      <span className="font-serif text-[1.3em] italic leading-none text-primary">{right}</span>
      <ArrowRight aria-hidden className="size-[1.1em] translate-y-[0.12em] text-foreground/70 transition-transform group-hover:translate-x-1" strokeWidth={1.5} />
    </>
  );
  const cls =
    "group grid min-h-14 grid-cols-[auto_minmax(1.5rem,1fr)_auto_auto] items-baseline gap-3 py-3 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  return (
    <li>
      {external ? (
        <a href={href} aria-label={label} className={cls}>
          {content}
        </a>
      ) : (
        <Link href={href} aria-label={label} className={cls}>
          {content}
        </Link>
      )}
    </li>
  );
}

/** «Как става»: редове на вертикална линия с точки (без номера). */
export function StepLine({ steps, className }: { steps: string[]; className?: string }) {
  return (
    <ol className={cn("relative space-y-6 pl-10", className)}>
      <span aria-hidden className="absolute bottom-1 left-[0.4rem] top-2 w-px bg-primary/60" />
      {steps.map((s) => (
        <li key={s} className="relative">
          <span aria-hidden className="absolute -left-10 top-[0.45em] size-3.5 rounded-full bg-primary/70" />
          {s}
        </li>
      ))}
    </ol>
  );
}
