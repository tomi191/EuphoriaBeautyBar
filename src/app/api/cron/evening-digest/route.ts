import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeCron } from "@/lib/cron-auth";
import { sendPushToResource } from "@/lib/push";
import { sofiaDateStr, sofiaTimeLabel, sofiaWallToUtc } from "@/lib/booking/time";

export const dynamic = "force-dynamic";

/**
 * Вечерен push дайджест: за всеки активен изпълнител с часове утре (Europe/Sofia)
 * изпраща „Утре: N часа, първият в HH:MM". Vercel cron в 16:00 UTC (19:00 София).
 */
export async function GET(req: Request) {
  if (!authorizeCron(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Утре по софийско време: [00:00 утре, 00:00 вдругиден) в UTC.
  const now = new Date();
  const tomorrowKey = sofiaDateStr(new Date(now.getTime() + 24 * 3600000));
  const dayStart = sofiaWallToUtc(tomorrowKey, "00:00");
  const dayEnd = new Date(dayStart.getTime() + 24 * 3600000);

  const [resources, bookings] = await Promise.all([
    db.query.resources.findMany({ where: (r, { eq }) => eq(r.active, true) }),
    db.query.bookings.findMany({
      where: (b, { and, gte, lt, inArray }) =>
        and(gte(b.startAt, dayStart), lt(b.startAt, dayEnd), inArray(b.status, ["confirmed", "pending", "arrived"])),
      orderBy: (b, { asc }) => [asc(b.startAt)],
      columns: { resourceId: true, startAt: true },
    }),
  ]);

  // Групирай по изпълнител; редовете идват сортирани, така че първият е най-ранният.
  const byResource = new Map<string, Date[]>();
  for (const b of bookings) {
    const list = byResource.get(b.resourceId) ?? [];
    list.push(b.startAt);
    byResource.set(b.resourceId, list);
  }

  let notified = 0;
  for (const r of resources) {
    const starts = byResource.get(r.id);
    if (!starts || starts.length === 0) continue;
    const firstAt = sofiaTimeLabel(starts[0]);
    const body = starts.length === 1 ? `Утре: 1 час, в ${firstAt}` : `Утре: ${starts.length} часа, първият в ${firstAt}`;
    await sendPushToResource(r.id, { title: "Утрешен график", body, url: "/staff" });
    notified++;
  }

  return NextResponse.json({ ok: true, notified });
}
