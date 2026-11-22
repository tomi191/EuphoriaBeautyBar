import { db } from "@/lib/db";

/**
 * „Готов" изпълнител = има поне една своя активна услуга (видима в каталога) и поне
 * един работен ден в собственото си работно време. Само готов изпълнител излиза пред
 * клиентите: /zapazi-chas, ценоразписът (а през него ботът, llms.txt, sitemap и schema)
 * и сървърната защита на онлайн записа. Нов изпълнител излиза сам, щом попълни и двете.
 */
export interface Readiness {
  services: boolean;
  hours: boolean;
}

export const isReady = (r: Readiness | undefined): boolean => !!r && r.services && r.hours;

/** Етикетът в админа за активен, но неготов изпълнител (null = готов). */
export function notReadyLabel(r: Readiness): string | null {
  if (r.services && r.hours) return null;
  if (!r.services && !r.hours) return "Не е готов: липсват услуги и работно време";
  return r.services ? "Не е готов: липсва работно време" : "Не е готов: липсват услуги";
}

export async function getReadiness(resourceIds: string[]): Promise<Map<string, Readiness>> {
  const out = new Map<string, Readiness>();
  if (resourceIds.length === 0) return out;
  const [offers, visibleItems, hours] = await Promise.all([
    db.query.resourceServices.findMany({
      where: (rs, { and, eq, inArray }) => and(eq(rs.active, true), inArray(rs.resourceId, resourceIds)),
      columns: { resourceId: true, serviceItemId: true },
    }),
    db.query.serviceItems.findMany({ where: (s, { eq }) => eq(s.bookableOnline, true), columns: { id: true } }),
    db.query.resourceWorkingHours.findMany({
      where: (w, { and, eq, inArray }) => and(eq(w.closed, false), inArray(w.resourceId, resourceIds)),
      columns: { resourceId: true, openTime: true, closeTime: true },
    }),
  ]);
  const visible = new Set(visibleItems.map((i) => i.id));
  for (const id of resourceIds) out.set(id, { services: false, hours: false });
  for (const o of offers) {
    const r = out.get(o.resourceId);
    if (r && visible.has(o.serviceItemId)) r.services = true;
  }
  for (const w of hours) {
    const r = out.get(w.resourceId);
    if (r && w.openTime && w.closeTime) r.hours = true;
  }
  return out;
}
