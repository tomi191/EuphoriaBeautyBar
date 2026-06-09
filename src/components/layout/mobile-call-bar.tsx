"use client";

import { usePathname } from "next/navigation";
import { Phone, MessageCircle } from "lucide-react";
import { siteConfig } from "@/lib/site";

/**
 * Закрепена долна лента само на mobile (lg:hidden) — два канала с ниска фрикция:
 * директно обаждане и Viber. Записването в салона е по телефон/Viber, не
 * през форма, затова това е най-прекият път до резервация.
 */
export function MobileCallBar() {
  const pathname = usePathname();
  // Скрита в админ панела и приложението за екипа (те имат собствена долна навигация).
  if (pathname.startsWith("/admin") || pathname.startsWith("/staff")) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 border-t border-border/60 bg-background/95 backdrop-blur lg:hidden">
      <a
        href={`tel:${siteConfig.contact.phone}`}
        className="flex items-center justify-center gap-2 py-3.5 text-sm font-medium text-foreground"
      >
        <Phone className="size-4" /> Обади се
      </a>
      <a
        href={siteConfig.social.viber}
        className="flex items-center justify-center gap-2 border-l border-border/60 bg-foreground py-3.5 text-sm font-medium text-background"
      >
        <MessageCircle className="size-4" /> Viber
      </a>
    </div>
  );
}
