import { cn } from "@/lib/utils";

/**
 * «Промоции в салона.» (Саиф 2.1, 2.4) с вълната над него (кадри A-начална, промоции-1440/390): H2 на началната,
 * H1 на /promotsii. Размерът е по скалата на заглавията на сайта (мярка на Канопус), не по кадъра.
 */
export function PromoTitle({ as: Tag = "h2", id, aside, className }: { as?: "h1" | "h2"; id?: string; aside: string; className?: string }) {
  return (
    <div className={className}>
      <svg viewBox="0 0 380 24" preserveAspectRatio="none" className="h-6 w-full text-primary/70 lg:w-[380px]" aria-hidden>
        <path d="M2 16 C 70 4, 150 2, 230 14 S 340 18, 378 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <div className="mt-6 lg:mt-5 lg:flex lg:items-end lg:justify-between lg:gap-10">
        <Tag id={id} className="font-display text-5xl leading-[1] font-medium md:text-7xl">
          Промоции <em className="block font-serif font-normal italic text-primary lg:inline">в салона.</em>
        </Tag>
        <p
          className={cn(
            "mt-4 font-display text-[17px] leading-snug text-muted-foreground [text-wrap:pretty] lg:mt-0 lg:mb-2 lg:max-w-[30rem] lg:text-right lg:font-serif lg:text-[22px] lg:italic",
          )}
        >
          {aside}
        </p>
      </div>
    </div>
  );
}
