import type { Metadata } from "next";
import { requireStaff } from "@/lib/actions/auth-guard";
import { db } from "@/lib/db";
import { sofiaWallToUtc, sofiaDateStr, sofiaTimeLabel } from "@/lib/booking/time";
import { StaffShell } from "@/components/staff/staff-shell";
import { BookingBoard, type BoardBooking, type BoardDay } from "@/components/staff/booking-board";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Дъска — Euphoria",
  robots: { index: false, follow: false },
};

const TZ = "Europe/Sofia";
const dayLongFmt = new Intl.DateTimeFormat("bg-BG", { timeZone: TZ, weekday: "long" });
const dayNumFmt = new Intl.DateTimeFormat("bg-BG", { timeZone: TZ, day: "numeric", month: "short" });

const DAYS_AHEAD = 7;

/** YYYY-MM-DD + n дни през обед-UTC → без DST изместване на деня (23/25-часови дни). */
function addDaysStr(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  dt.setUTCDate(dt.getUTCDate() + n);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

export default async function StaffBoardPage() {
  const { resource } = await requireStaff();

  const now = new Date();
  const todayKey = sofiaDateStr(now);

  // Прозорец: от началото на днешния ден (Sofia) до началото на 7-ия ден напред.
  // Границите се смятат от датовия низ (DST-safe), не с фиксирани 24h стъпки.
  const windowStart = sofiaWallToUtc(todayKey, "00:00");
  const windowEnd = sofiaWallToUtc(addDaysStr(todayKey, DAYS_AHEAD), "00:00");

  const bookings = await db.query.bookings.findMany({
    where: (b, { and, eq, gte, lt, inArray }) =>
      and(
        eq(b.resourceId, resource.id),
        gte(b.startAt, windowStart),
        lt(b.startAt, windowEnd),
        inArray(b.status, ["confirmed", "pending", "arrived"]),
      ),
    orderBy: (b, { asc }) => [asc(b.startAt)],
  });

  const clientIds = [...new Set(bookings.map((b) => b.clientId).filter(Boolean) as string[])];
  const clients = clientIds.length
    ? await db.query.clients.findMany({ where: (c, { inArray }) => inArray(c.id, clientIds) })
    : [];
  const clientById = new Map(clients.map((c) => [c.id, c]));

  // Колони = всеки от следващите 7 дни (вкл. днес). Ключът се смята през датов низ
  // (DST-safe), а форматирането — при обед (12:00), за да не се измести денят.
  const days: BoardDay[] = Array.from({ length: DAYS_AHEAD }, (_, i) => {
    const key = addDaysStr(todayKey, i);
    const noon = sofiaWallToUtc(key, "12:00");
    return {
      dateKey: key,
      weekday: dayLongFmt.format(noon),
      dayLabel: dayNumFmt.format(noon),
      isToday: key === todayKey,
      bookings: [] as BoardBooking[],
    };
  });
  const dayByKey = new Map(days.map((d) => [d.dateKey, d]));

  for (const b of bookings) {
    const key = sofiaDateStr(b.startAt);
    const col = dayByKey.get(key);
    if (!col) continue;
    const client = b.clientId ? clientById.get(b.clientId) : undefined;
    col.bookings.push({
      id: b.id,
      startISO: b.startAt.toISOString(),
      endISO: b.endAt.toISOString(),
      timeLabel: sofiaTimeLabel(b.startAt),
      durationMin: Math.round((b.endAt.getTime() - b.startAt.getTime()) / 60000),
      serviceName: b.serviceName,
      clientName: client?.name ?? null,
      status: b.status,
    });
  }

  return (
    <StaffShell kind={resource.kind}>
      <div className="mb-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Премести с влачене</p>
        <h1 className="mt-1 font-display text-2xl font-medium">Дъска</h1>
        <p className="mt-1 text-sm text-muted-foreground">Хвани час и го пусни в друг ден, за да го преместиш.</p>
      </div>

      <BookingBoard days={days} />
    </StaffShell>
  );
}
