"use client";

import { useEffect } from "react";
import { callKind, callSpot } from "@/lib/call-clicks";

/**
 * Цел П3 (решение 7): брои натисканията на «Обади се» (tel:) и Viber по целия публичен сайт.
 * Един слушател на документа, без бисквитки и без нищо в браузъра; sendBeacon не бави обаждането
 * (не спираме натискането и не чакаме отговор). /admin и /staff не се броят.
 */
export function CallClickCounter() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target instanceof Element ? e.target : null;
      const link = target?.closest("a[href]");
      if (!link) return;
      const page = window.location.pathname;
      if (page.startsWith("/admin") || page.startsWith("/staff")) return;
      const kind = callKind(link.getAttribute("href") ?? "");
      if (!kind) return;
      const body = JSON.stringify({ page, kind, spot: callSpot(link) });
      // Броячът никога не бива да чупи обаждането: грешка тук само губи едно натискане
      // (сървърът пише своите грешки в дневника на Vercel).
      try {
        if (!navigator.sendBeacon?.("/api/call-click", body)) {
          void fetch("/api/call-click", { method: "POST", body, keepalive: true }).catch(() => {});
        }
      } catch {
        /* виж горе */
      }
    };
    document.addEventListener("click", onClick, { capture: true, passive: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);
  return null;
}
