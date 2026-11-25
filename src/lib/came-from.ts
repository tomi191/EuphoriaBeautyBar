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

const SOURCE_WORD: Record<string, string> = { facebook: "Facebook", instagram: "Instagram", google: "Google" };

/**
 * Редът в администрацията (колоната «Дошло»): само източникът с човешка дума, «Facebook»; друг източник е името му
 * с главна буква. Видът (utm_medium, «post») не се показва. Без метка → null (редът не се показва).
 */
export function cameFromLabel(cameFrom: string | null | undefined): string | null {
  if (!cameFrom) return null;
  const q = new URLSearchParams(cameFrom);
  const source = q.get("utm_source") ?? q.get("from");
  if (!source) return null;
  return SOURCE_WORD[source.toLowerCase()] ?? source.charAt(0).toUpperCase() + source.slice(1);
}
