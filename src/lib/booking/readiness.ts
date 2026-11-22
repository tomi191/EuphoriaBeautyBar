import { db } from "@/lib/db";

/**
 * „Готов" изпълнител = има поне една своя активна услуга (видима в каталога). Само готов
 * изпълнител излиза пред клиентите: /zapazi-chas, ценоразписът (а през него ботът, llms.txt,
 * sitemap и schema) и сървърната защита на онлайн записа. Нов изпълнител излиза сам, щом
 * отметне услуга. Свое работно време НЕ се иска: без него часовете идват от салонните
 * (slots.ts: `ownWh ?? salonWh`).
 */
export interface Readiness {
  services: boolean;
}

export const isReady = (r: Readiness | undefined): boolean => !!r && r.services;

/** Етикетът в админа за активен, но неготов изпълнител (null = готов). */
export function notReadyLabel(r: Readiness): string | null {
  return r.services ? null : "Не е готов: липсват услуги";
}

export async function getReadiness(resourceIds: string[]): Promise<Map<string, Readiness>> {
  const out = new Map<string, Readiness>();
  if (resourceIds.length === 0) return out;
  const [offers, visibleItems] = await Promise.all([
    db.query.resourceServices.findMany({
      where: (rs, { and, eq, inArray }) => and(eq(rs.active, true), inArray(rs.resourceId, resourceIds)),
      columns: { resourceId: true, serviceItemId: true },
    }),
    db.query.serviceItems.findMany({ where: (s, { eq }) => eq(s.bookableOnline, true), columns: { id: true } }),
  ]);
  const visible = new Set(visibleItems.map((i) => i.id));
  for (const id of resourceIds) out.set(id, { services: false });
  for (const o of offers) {
    const r = out.get(o.resourceId);
    if (r && visible.has(o.serviceItemId)) r.services = true;
  }
  return out;
}
