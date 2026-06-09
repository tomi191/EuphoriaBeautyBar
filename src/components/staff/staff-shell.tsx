"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Scissors, Clock, User, LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/staff", label: "График", icon: CalendarDays, exact: true },
  { href: "/staff/services", label: "Услуги", icon: Scissors, exact: false },
  { href: "/staff/hours", label: "Часове", icon: Clock, exact: false },
  { href: "/staff/profile", label: "Профил", icon: User, exact: false },
];

export function StaffShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Регистрира service worker-а (PWA installability) на всички екранни страници.
  React.useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  async function handleSignOut() {
    await authClient.signOut();
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

      <div className="mx-auto max-w-lg px-4 py-6">{children}</div>

      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-lg border-t border-border bg-background">
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
