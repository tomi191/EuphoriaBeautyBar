import { siteConfig } from "@/lib/site";

/**
 * Цел П3 (решение 7): брояч на натисканията на «Обади се» (tel:) и Viber.
 * Тук е само чистата логика (без база): кой вид е връзката, кое е копчето, проверка на заявката.
 * Браузърът ползва callKind и callSpot; /api/call-click ползва останалото
 * (таванът на заявките е в call-clicks-limit.ts, защото иска node:crypto).
 */

export type CallKind = "tel" | "viber" | "tel-other" | "viber-other";
export type CallClick = { page: string; kind: CallKind; spot: string };

const SALON_DIGITS = siteConfig.contact.phone.replace(/\D/g, "");
const KINDS: readonly CallKind[] = ["tel", "viber", "tel-other", "viber-other"];
// Местата, които броим: data-call-spot на обвивката или най-близкият ориентир на страницата.
export const SPOTS = ["header", "footer", "call-bar", "menu", "bot", "dialog", "page"] as const;

/** Вид на връзката или null, ако не е обаждане или чат във Viber (споделяне във Viber не се брои). */
export function callKind(href: string): CallKind | null {
  const h = href.trim().toLowerCase();
  let digits: string;
  let base: "tel" | "viber";
  if (h.startsWith("tel:")) {
    base = "tel";
    digits = h.slice(4).replace(/\D/g, "");
  } else if (h.startsWith("viber://chat")) {
    base = "viber";
    let number = "";
    try {
      number = decodeURIComponent(h.split("number=")[1]?.split("&")[0] ?? "");
    } catch {
      number = "";
    }
    digits = number.replace(/\D/g, "");
  } else {
    return null;
  }
  if (!digits) return null;
  const salon = digits === SALON_DIGITS || (digits.startsWith("0") && SALON_DIGITS.endsWith(digits.slice(1)));
  return salon ? base : `${base}-other`;
}

type ElementLike = { closest(selector: string): { getAttribute(name: string): string | null } | null };

/** Кое копче: data-call-spot на най-близката обвивка, иначе заглавната част, долната част, прозорец или страницата. */
export function callSpot(el: ElementLike): string {
  const own = el.closest("[data-call-spot]")?.getAttribute("data-call-spot");
  if (own && (SPOTS as readonly string[]).includes(own)) return own;
  if (el.closest("header")) return "header";
  if (el.closest("footer")) return "footer";
  if (el.closest('[role="dialog"]')) return "dialog";
  return "page";
}

const PAGE_RE = /^\/[A-Za-z0-9\-/_.%]{0,119}$/;

/** Проверка на тялото от браузъра. Връща чистия запис или null. */
export function parseCallClick(body: unknown): CallClick | null {
  if (!body || typeof body !== "object") return null;
  const { page, kind, spot } = body as Record<string, unknown>;
  if (typeof page !== "string" || typeof kind !== "string" || typeof spot !== "string") return null;
  const cleanPage = page.length > 1 ? page.replace(/\/+$/, "") || "/" : page;
  if (!PAGE_RE.test(cleanPage)) return null;
  if (cleanPage.startsWith("/admin") || cleanPage.startsWith("/staff")) return null;
  if (!(KINDS as readonly string[]).includes(kind)) return null;
  if (!(SPOTS as readonly string[]).includes(spot)) return null;
  return { page: cleanPage, kind: kind as CallKind, spot };
}

/** Денят в София (ГГГГ-ММ-ДД), по който се брои. */
export function sofiaDay(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Sofia", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
