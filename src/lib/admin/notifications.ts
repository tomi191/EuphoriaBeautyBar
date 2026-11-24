import { db } from "@/lib/db";
import { sofiaDateStr, sofiaTimeLabel } from "@/lib/booking/time";
import { positionForCategory } from "@/lib/rental/listing-rules";
import { INQUIRY_BELL_TITLE, inquiryBellDetail } from "@/lib/rental/inquiry-rules";
import { pendingPhotoBellItems } from "@/lib/gallery/review";
import { pendingCampaignBellItems } from "@/lib/campaigns/core";

export type AdminNotification = {
  id: string;
  kind: "new_online" | "cancelled" | "rental_inquiry" | "gallery_pending" | "campaign_pending";
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
  const [rows, seenRow, inquiries, photos, campaigns] = await Promise.all([
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
    // Запитванията от обявите за място под наем (идват от самата таблица, без изпращане).
    db.query.rentalInquiries.findMany({
      where: (r, { gte }) => gte(r.createdAt, since),
      orderBy: (r, { desc }) => [desc(r.createdAt)],
      limit: 50,
      columns: { id: true, name: true, phone: true, createdAt: true, positionId: true },
    }),
    // Снимките от специалистите, които чакат одобрение (вързан или не Telegram).
    pendingPhotoBellItems(since),
    // Промоциите, които чакат одобрение (№11).
    pendingCampaignBellItems(since),
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
  if (inquiries.length) {
    const positionIds = [...new Set(inquiries.map((i) => i.positionId))];
    const positions = await db.query.rentalPositions.findMany({
      where: (p, { inArray }) => inArray(p.id, positionIds),
      columns: { id: true, categoryId: true },
    });
    const categories = await db.query.serviceCategories.findMany({ columns: { id: true, slug: true } });
    const catSlug = new Map(categories.map((c) => [c.id, c.slug]));
    const posMap = new Map(positions.map((p) => [p.id, p.categoryId ? catSlug.get(p.categoryId) : undefined]));
    for (const i of inquiries) {
      const slug = posMap.get(i.positionId);
      items.push({
        id: `${i.id}:rental_inquiry`,
        kind: "rental_inquiry",
        title: INQUIRY_BELL_TITLE,
        detail: inquiryBellDetail({ name: i.name, phone: i.phone, position: slug ? positionForCategory(slug) : "специалист" }),
        at: i.createdAt.toISOString(),
        href: "/admin/positions?tab=inquiries",
      });
    }
  }
  items.push(...photos, ...campaigns);
  items.sort((a, c) => (a.at < c.at ? 1 : -1));
  const top = items.slice(0, 30);

  const seenAt = (seenRow?.value as { at?: string } | undefined)?.at ?? null;
  const unseen = seenAt ? top.filter((i) => i.at > seenAt).length : top.length;
  return { items: top, seenAt, unseen };
}
