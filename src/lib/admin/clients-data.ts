import { db } from "@/lib/db";
import { toEur } from "@/lib/booking/offering";
import type { ClientBooking, ClientInfo } from "@/lib/admin/clients";

/**
 * Данните за /admin/clients: часовете с клиент и клиентите. Колоните са изброени изрично:
 * bookings.notes и client_notes не се четат (бележките на специалиста не стигат до страницата).
 * Цената е като в оборота (actions/revenue.ts): снимката price_eur → цената на специалиста →
 * каталожната.
 */
export async function loadAdminClients(): Promise<{
  clients: ClientInfo[];
  bookings: ClientBooking[];
  resources: { id: string; name: string }[];
}> {
  const [rows, clients, resources] = await Promise.all([
    db.query.bookings.findMany({
      where: (b, { isNotNull }) => isNotNull(b.clientId),
      columns: {
        id: true,
        clientId: true,
        resourceId: true,
        serviceName: true,
        serviceItemId: true,
        startAt: true,
        status: true,
        priceEur: true,
      },
    }),
    db.query.clients.findMany({ columns: { id: true, name: true, phone: true } }),
    db.query.resources.findMany({
      columns: { id: true, name: true },
      orderBy: (r, { asc, desc }) => [desc(r.active), asc(r.sortOrder), asc(r.name)],
    }),
  ]);

  const missingItemIds = [
    ...new Set(rows.filter((r) => r.priceEur == null && r.serviceItemId).map((r) => r.serviceItemId as string)),
  ];
  const [own, items] = missingItemIds.length
    ? await Promise.all([
        db.query.resourceServices.findMany({ where: (rs, { inArray }) => inArray(rs.serviceItemId, missingItemIds) }),
        db.query.serviceItems.findMany({ where: (s, { inArray }) => inArray(s.id, missingItemIds) }),
      ])
    : [[], []];
  const ownByKey = new Map(own.map((o) => [`${o.resourceId}:${o.serviceItemId}`, toEur(o.price, o.currency)]));
  const itemById = new Map(items.map((i) => [i.id, toEur(i.price, i.currency)]));

  const bookings: ClientBooking[] = rows.map((r) => ({
    id: r.id,
    clientId: r.clientId as string,
    resourceId: r.resourceId,
    serviceName: r.serviceName,
    startMs: r.startAt.getTime(),
    status: r.status,
    price:
      r.priceEur ??
      (r.serviceItemId
        ? ownByKey.get(`${r.resourceId}:${r.serviceItemId}`) ?? itemById.get(r.serviceItemId) ?? null
        : null),
  }));

  return { clients, bookings, resources };
}
