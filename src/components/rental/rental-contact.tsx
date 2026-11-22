import { MessageCircle, Phone } from "lucide-react";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

/**
 * «Обади се» и «Пиши във Viber» на обявите за място под наем (кадрите «Бар меню», визия №12).
 * Текстовете са на Саиф (доклад 22.11.2026, част 2). Височината е 52 px на телефон и 56 px на
 * компютър (бележката на Канопус: кадърът преувеличава бутоните).
 */
const base =
  "inline-flex items-center justify-center gap-2.5 rounded-full px-6 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

function CallLink({ className }: { className?: string }) {
  return (
    <a
      href={`tel:${siteConfig.contact.phone}`}
      aria-label="Обади се на салона"
      className={cn(base, "bg-foreground text-background hover:bg-foreground/90", className)}
    >
      <Phone className="size-5" strokeWidth={1.6} aria-hidden />
      Обади се
    </a>
  );
}

function ViberLink({ className }: { className?: string }) {
  return (
    <a
      href={siteConfig.social.viber}
      aria-label="Пиши на салона във Viber"
      className={cn(base, "border border-foreground/25 bg-background text-foreground hover:bg-secondary", className)}
    >
      <MessageCircle className="size-5" strokeWidth={1.6} aria-hidden />
      Пиши във Viber
    </a>
  );
}

/** Двата бутона в страницата (компютър). */
export function RentalCallButtons({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-4", className)}>
      <CallLink className="h-14 min-w-56 text-lg" />
      <ViberLink className="h-14 min-w-56 text-lg" />
    </div>
  );
}

/**
 * Долната лента на телефон: заменя общата (MobileCallBar се скрива на /karieri). `data-rental-bar`
 * дава на обвивката в layout-а място отдолу, за да не закрива лентата края на страницата.
 * Височината е в `--rental-bar-h` (globals.css): от нея смятат и героят на обявата, и полето в layout-а.
 */
export function RentalCallBar() {
  return (
    <div
      data-rental-bar
      className="fixed inset-x-0 bottom-0 z-40 grid h-[calc(var(--rental-bar-h)+env(safe-area-inset-bottom))] grid-cols-2 content-center gap-2 border-t border-border/60 bg-background/95 px-3 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <CallLink className="h-[52px] px-3 text-base" />
      <ViberLink className="h-[52px] px-3 text-base" />
    </div>
  );
}
