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

export default async function StaffBoardPage() {
  const { resource } = await requireStaff();

  const now = new Date();
  const todayKey = sofiaDateStr(now);

  // Прозорец: от началото на днешния ден (Sofia) до края на 7-ия ден напред.
  const windowStart = sofiaWallToUtc(todayKey, "00:00");
  const windowEnd = new Date(windowStart.getTime() + DAYS_AHEAD * 24 * 3600000);

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

  // Колони = всеки от следващите 7 дни (вкл. днес).
  const days: BoardDay[] = Array.from({ length: DAYS_AHEAD }, (_, i) => {
    const d = new Date(windowStart.getTime() + i * 86400000);
    const key = sofiaDateStr(d);
    return {
      dateKey: key,
      weekday: dayLongFmt.format(d),
      dayLabel: dayNumFmt.format(d),
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
    <StaffShell>
      <div className="mb-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Премести с влачене</p>
        <h1 className="mt-1 font-display text-2xl font-medium">Дъска</h1>
        <p className="mt-1 text-sm text-muted-foreground">Хвани час и го пусни в друг ден, за да го преместиш.</p>
      </div>

      <BookingBoard days={days} />
    </StaffShell>
  );
}
