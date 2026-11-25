/**
 * Откъде е дошъл човекът: само метките от адреса («from» и utm_*), без бисквитки. Ползват го часовете
 * (bookings.came_from) и запитванията от обявите (rental_inquiries.came_from).
 */

/** Откъде е дошъл клиентът (bookings.came_from): само «from» и UTM от адреса, изчистени, до 200 знака. */
export function cleanCameFrom(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const q = new URLSearchParams(raw.startsWith("?") ? raw.slice(1) : raw);
  const out = new URLSearchParams();
  for (const k of ["from", "utm_source", "utm_medium", "utm_campaign", "utm_content"]) {
    const v = (q.get(k) ?? "").replace(/[^\p{L}\p{N}_.\-]/gu, "").slice(0, 60);
    if (v) out.set(k, v);
  }
  if (![...out.keys()].length && q.get("promo")) out.set("from", "promo");
  const s = out.toString();
  return s ? s.slice(0, 200) : null;
}

/** Редът в администрацията: «Откъде: facebook, post»; без метка → null (редът не се показва). */
export function cameFromLabel(cameFrom: string | null | undefined): string | null {
  if (!cameFrom) return null;
  const q = new URLSearchParams(cameFrom);
  const parts = [q.get("from") ?? q.get("utm_source"), q.get("utm_medium")].filter(Boolean);
  return parts.length ? `Откъде: ${parts.join(", ")}` : null;
}
