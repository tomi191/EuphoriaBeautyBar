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
  MessageSquare,
  Newspaper,
  Scissors,
  Settings,
  Star,
  Users,
  Wallet,
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

  async function handleSignOut() {
    await authClient.signOut();
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
        <Logo width={110} height={32} />
      </header>

      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-8 lg:px-10 lg:py-12">{children}</div>
      </main>
    </div>
  );
}
