"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  CalendarDays,
  Contact,
  HelpCircle,
  Home,
  Image as ImageIcon,
  LogOut,
  Menu,
  MessageSquare,
  Newspaper,
  Scissors,
  Settings,
  Star,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/admin", label: "Табло", icon: Home, exact: true },
  { href: "/admin/bookings", label: "График", icon: CalendarDays },
  { href: "/admin/revenue", label: "Оборот", icon: Wallet },
  { href: "/admin/resources", label: "Изпълнители", icon: Contact },
  { href: "/admin/team", label: "Екип", icon: Users },
  { href: "/admin/services", label: "Услуги и цени", icon: Scissors },
  { href: "/admin/blog", label: "Журнал", icon: Newspaper },
  { href: "/admin/testimonials", label: "Отзиви", icon: MessageSquare },
  { href: "/admin/reviews", label: "Google ревюта", icon: Star },
  { href: "/admin/gallery", label: "Галерия", icon: ImageIcon },
  { href: "/admin/faq", label: "ЧЗВ", icon: HelpCircle },
  { href: "/admin/positions", label: "Места под наем", icon: Briefcase },
  { href: "/admin/settings", label: "Настройки", icon: Settings },
];

export function AdminShell({ user, children }: { user: { name?: string | null; email?: string | null }; children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // Затвори мобилното меню при навигация.
  React.useEffect(() => setMobileOpen(false), [pathname]);

  async function handleSignOut() {
    // Редиректвай към login винаги — мрежова грешка не бива да заклещва бутона.
    try {
      await authClient.signOut();
    } catch {
      /* продължаваме към login */
    }
    window.location.href = "/admin/login";
  }

  return (
    <div className="min-h-screen bg-secondary/40">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-background lg:flex">
        <div className="flex h-20 items-center border-b border-border px-5">
          <Logo width={120} height={36} />
        </div>
        <nav className="flex-1 space-y-0.5 p-3">
          {nav.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <item.icon className="size-4" strokeWidth={1.6} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-3">
          <div className="mb-2 rounded-md bg-secondary p-3 text-xs">
            <p className="font-medium text-foreground">{user.name ?? "Администратор"}</p>
            <p className="truncate text-muted-foreground">{user.email}</p>
          </div>
          <div className="flex gap-1.5">
            <Link
              href="/"
              target="_blank"
              className="flex-1 rounded-md border border-border bg-background py-2 text-center text-xs font-medium hover:bg-secondary"
            >
              Виж сайта
            </Link>
            <button
              onClick={handleSignOut}
              className="grid size-9 place-items-center rounded-md border border-border bg-background hover:border-destructive hover:bg-destructive/10 hover:text-destructive"
              aria-label="Изход"
            >
              <LogOut className="size-4" strokeWidth={1.6} />
            </button>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur lg:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Отвори менюто"
          className="grid size-11 place-items-center rounded-md hover:bg-secondary"
        >
          <Menu className="size-5" />
        </button>
        <Logo width={110} height={32} />
      </header>

      {/* Мобилна навигация — панелът нямаше НИКАква навигация на телефон. */}
      {mobileOpen && (
        <div className="lg:hidden">
          <button aria-label="Затвори" className="fixed inset-0 z-40 bg-foreground/40" onClick={() => setMobileOpen(false)} />
          <div role="dialog" aria-modal="true" aria-label="Меню" className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85%] flex-col border-r border-border bg-background">
            <div className="flex h-16 items-center justify-between border-b border-border px-4">
              <Logo width={110} height={32} />
              <button onClick={() => setMobileOpen(false)} aria-label="Затвори" className="grid size-11 place-items-center rounded-md hover:bg-secondary">
                <X className="size-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
              {nav.map((item) => {
                const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition-colors",
                      active ? "bg-foreground text-background" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )}
                  >
                    <item.icon className="size-4" strokeWidth={1.6} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-border p-3">
              <button
                onClick={handleSignOut}
                className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-background py-2.5 text-sm font-medium hover:border-destructive hover:text-destructive"
              >
                <LogOut className="size-4" strokeWidth={1.6} /> Изход
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-8 lg:px-10 lg:py-12">{children}</div>
      </main>
    </div>
  );
}
