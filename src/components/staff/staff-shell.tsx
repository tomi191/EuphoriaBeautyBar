"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, LayoutGrid, Scissors, HandHeart, Flower2, Clock, User, LogOut, Plus, type LucideIcon } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

// Икона на таба „Услуги" според специалността на изпълнителя (resource.kind):
// фризьорът вижда ножици, маникюристът — ръка, козметикът — цвете. Иконите
// съвпадат с публичния service-card. Fallback Scissors при липсващ/непознат kind.
const SERVICE_ICON: Record<string, LucideIcon> = {
  hair: Scissors,
  nails: HandHeart,
  cosmetics: Flower2,
};

export function StaffShell({
  children,
  kind,
  wide,
  split,
}: {
  children: React.ReactNode;
  kind?: string;
  wide?: boolean;
  /** «Промоции» на компютър: списъкът и панелът един до друг (кадър приложение-1440). */
  split?: boolean;
}) {
  const pathname = usePathname();

  // Tabs се строят на render, защото иконата на „Услуги" зависи от kind.
  const tabs = [
    { href: "/staff", label: "График", icon: CalendarDays, exact: true },
    { href: "/staff/board", label: "Дъска", icon: LayoutGrid, exact: false },
    { href: "/staff/services", label: "Услуги", icon: SERVICE_ICON[kind ?? ""] ?? Scissors, exact: false },
    { href: "/staff/hours", label: "Часове", icon: Clock, exact: false },
    { href: "/staff/profile", label: "Профил", icon: User, exact: false },
  ];
  const [online, setOnline] = React.useState(true);

  // SW регистрацията е в layout-а (SwRegister), за всички staff екрани —
  // не дублирай тук, иначе три register('/sw.js') на профил екрана.

  // Следи мрежовия статус за offline индикатора.
  React.useEffect(() => {
    setOnline(navigator.onLine);
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  async function handleSignOut() {
    // Мрежова грешка при signOut не бива да заклещва бутона — редиректваме винаги
    // (cookie-то може вече да е изчистено; login иначе връща обратно при жива сесия).
    try {
      await authClient.signOut();
    } catch {
      /* продължаваме към login независимо */
    }
    // Изчисти кешираните /staff страници (клиентски PII) от Cache Storage — GDPR.
    try {
      const reg = await navigator.serviceWorker?.ready;
      reg?.active?.postMessage({ type: "CLEAR_STAFF_CACHE" });
    } catch {
      /* SW не е наличен — нищо за чистене */
    }
    window.location.href = "/staff/login";
  }

  return (
    <div className="min-h-screen bg-secondary/30 pb-20">
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center overflow-hidden rounded-xl bg-cream">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/brand/logo-mark-black.png" alt="" className="size-6 object-contain dark:hidden" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/brand/logo-mark-white.png" alt="" className="hidden size-6 object-contain dark:block" />
          </span>
          <span className="font-display text-base font-semibold tracking-tight">
            Euphoria <span className="font-normal text-muted-foreground">· Екип</span>
          </span>
        </div>
        <button
          onClick={handleSignOut}
          aria-label="Изход"
          className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="size-[18px]" strokeWidth={1.7} />
        </button>
      </header>

      {!online && (
        <div className="bg-foreground/80 py-1 text-center text-xs text-background">
          Офлайн — показвам последното заредено
        </div>
      )}

      {/* wide: «Моите снимки» на компютър е по-широка (3 колони) и отстъпва вляво, докато панелът
          «Снимка от работата» е отворен (листът слага data-work-panel на body). */}
      <div
        className={cn(
          "mx-auto max-w-lg px-4 py-6",
          split && "lg:max-w-[90rem] lg:px-6",
          wide &&
            "lg:max-w-[38rem] lg:transition-[translate] lg:duration-300 lg:[body[data-work-panel]_&]:translate-x-[min(0px,calc(50vw-859px))]",
        )}
      >
        {children}
      </div>

      {/* Глобален „Нов час" — достъпен от всеки екран (не само от графика). */}
      {/* В «Промоции» го няма (кадрите на №11): формата и панелът имат свой основен бутон. */}
      {pathname !== "/staff/new" && !pathname.startsWith("/staff/promotions") && (
        <Link
          href="/staff/new"
          aria-label="Нов час"
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] right-4 z-30 grid size-14 place-items-center rounded-full bg-primary text-background shadow-lg shadow-primary/30 transition-transform active:scale-95"
        >
          <Plus className="size-6" strokeWidth={2.2} />
        </Link>
      )}

      <nav
        className={cn(
          "fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-lg border-t border-border bg-background pb-[env(safe-area-inset-bottom)]",
          wide &&
            "lg:max-w-[38rem] lg:transition-[translate] lg:duration-300 lg:[body[data-work-panel]_&]:translate-x-[min(0px,calc(50vw-859px))]",
        )}
      >
        {tabs.map((t) => {
          const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <t.icon className="size-5" strokeWidth={1.6} />
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
