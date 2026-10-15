import { db } from "@/lib/db";
import { sofiaDateStr, sofiaTimeLabel } from "@/lib/booking/time";

export type AdminNotification = {
  id: string;
  kind: "new_online" | "cancelled";
  title: string;
  detail: string;
  at: string;
  href: string;
};
export type AdminNotificationsState = { items: AdminNotification[]; seenAt: string | null; unseen: number };

export const SEEN_KEY = "admin_notifications_seen_at";
const dayMonth = new Intl.DateTimeFormat("bg-BG", { timeZone: "Europe/Sofia", day: "2-digit", month: "2-digit" });

export async function loadAdminNotifications(): Promise<AdminNotificationsState> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [rows, seenRow] = await Promise.all([
    db.query.bookings.findMany({
      where: (b, { or, and, gte, eq, isNotNull }) =>
        or(
          and(eq(b.source, "online"), gte(b.createdAt, since)),
          and(isNotNull(b.cancelledAt), gte(b.cancelledAt, since)),
        ),
      orderBy: (b, { desc }) => [desc(b.createdAt)],
      limit: 200,
    }),
    db.query.siteSettings.findFirst({ where: (s, { eq }) => eq(s.key, SEEN_KEY) }),
  ]);

  const clientIds = [...new Set(rows.map((b) => b.clientId).filter(Boolean))] as string[];
  const [clients, resources] = await Promise.all([
    clientIds.length ? db.query.clients.findMany({ where: (c, { inArray }) => inArray(c.id, clientIds) }) : [],
    db.query.resources.findMany({ columns: { id: true, name: true } }),
  ]);
  const clientMap = new Map(clients.map((c) => [c.id, c.name]));
  const resMap = new Map(resources.map((r) => [r.id, r.name]));

  const items: AdminNotification[] = [];
  for (const b of rows) {
    const clientName = (b.clientId && clientMap.get(b.clientId)) || "Клиент";
    const when = `за ${dayMonth.format(b.startAt)}, ${sofiaTimeLabel(b.startAt)}`;
    const performer = resMap.get(b.resourceId);
    const href = `/admin/bookings?date=${sofiaDateStr(b.startAt)}`;
    if (b.source === "online" && b.createdAt >= since) {
      items.push({
        id: `${b.id}:new_online`,
        kind: "new_online",
        title: `${clientName}: ${b.serviceName}`,
        detail: performer ? `${when} · ${performer}` : when,
        at: b.createdAt.toISOString(),
        href,
      });
    }
    if (b.cancelledAt && b.cancelledAt >= since) {
      items.push({
        id: `${b.id}:cancelled`,
        kind: "cancelled",
        title: `Отказан час: ${clientName}`,
        detail: `${b.serviceName} · ${when}`,
        at: b.cancelledAt.toISOString(),
        href,
      });
    }
  }
  items.sort((a, c) => (a.at < c.at ? 1 : -1));
  const top = items.slice(0, 30);

  const seenAt = (seenRow?.value as { at?: string } | undefined)?.at ?? null;
  const unseen = seenAt ? top.filter((i) => i.at > seenAt).length : top.length;
  return { items: top, seenAt, unseen };
}
