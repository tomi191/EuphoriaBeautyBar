"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Phone, MessageCircle, Calendar } from "lucide-react";
import { siteConfig } from "@/lib/site";

/**
 * Закрепена долна лента само на mobile (lg:hidden) — трите канала за запазване на
 * час. Онлайн записването е основното действие (акцентирано), обаждането и Viber
 * остават за клиентите, които предпочитат човек отсреща. До одит №7 лентата
 * предлагаше само телефон и Viber, макар сайтът да има работеща форма от юни.
 */
export function MobileCallBar() {
  const pathname = usePathname();
  // Скрита в админ панела и приложението за екипа (те имат собствена долна навигация).
  if (pathname.startsWith("/admin") || pathname.startsWith("/staff")) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-[1fr_1fr_1.3fr] border-t border-border/60 bg-background/95 backdrop-blur lg:hidden">
      <a
        href={`tel:${siteConfig.contact.phone}`}
        className="flex min-h-12 items-center justify-center gap-1.5 py-3.5 text-sm font-medium text-foreground"
      >
        <Phone className="size-4" /> Обади се
      </a>
      <a
        href={siteConfig.social.viber}
        className="flex min-h-12 items-center justify-center gap-1.5 border-l border-border/60 py-3.5 text-sm font-medium text-foreground"
      >
        <MessageCircle className="size-4" /> Viber
      </a>
      <Link
        href="/zapazi-chas"
        className="flex min-h-12 items-center justify-center gap-1.5 border-l border-border/60 bg-foreground py-3.5 text-sm font-medium text-background"
      >
        <Calendar className="size-4" /> Запиши час
      </Link>
    </div>
  );
}
