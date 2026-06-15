import type { Metadata } from "next";
import { requireStaff } from "@/lib/actions/auth-guard";
import { db } from "@/lib/db";
import { StaffShell } from "@/components/staff/staff-shell";
import { HoursEditor, type DayHours, type TimeOffItem } from "@/components/staff/hours-editor";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Часове — Euphoria",
  robots: { index: false, follow: false },
};

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export default async function StaffHoursPage() {
  const { resource } = await requireStaff();

  const [own, salon, timeoff] = await Promise.all([
    db.query.resourceWorkingHours.findMany({ where: (w, { eq }) => eq(w.resourceId, resource.id) }),
    db.query.workingHours.findMany(),
    db.query.timeOff.findMany({
      where: (t, { and, eq, gte }) => and(eq(t.resourceId, resource.id), gte(t.endAt, new Date())),
      orderBy: (t, { asc }) => [asc(t.startAt)],
    }),
  ]);

  const ownByDay = new Map(own.map((w) => [w.weekday, w]));
  const salonByDay = new Map(salon.map((w) => [w.weekday, w]));

  const days: DayHours[] = WEEK_ORDER.map((wd) => {
    const o = ownByDay.get(wd);
    const s = salonByDay.get(wd);
    const src = o ?? s;
    return {
      weekday: wd,
      openTime: src?.openTime ?? "09:00",
      closeTime: src?.closeTime ?? "18:00",
      closed: src?.closed ?? wd === 0,
      custom: !!o,
    };
  });

  const offs: TimeOffItem[] = timeoff.map((t) => ({
    id: t.id,
    startAt: t.startAt.toISOString(),
    endAt: t.endAt.toISOString(),
    reason: t.reason,
  }));

  return (
    <StaffShell kind={resource.kind}>
      <div className="mb-5">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Управление</p>
        <h1 className="mt-1 font-display text-2xl font-medium">Моите часове</h1>
        <p className="mt-1 text-sm text-muted-foreground">Работно време по дни и почивки/отпуск.</p>
      </div>
      <HoursEditor days={days} timeOff={offs} />
    </StaffShell>
  );
}
