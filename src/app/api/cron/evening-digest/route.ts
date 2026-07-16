import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeCron } from "@/lib/cron-auth";
import { notifyResource } from "@/lib/notify";
import { sendTelegramToAdmin } from "@/lib/telegram";
import { sendOpsAlert } from "@/lib/email/booking";
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

  // Сглоби целите, после изпрати ПАРАЛЕЛНО. Сериен await в цикъл рискуваше Vercel function
  // timeout при повече изпълнители → последните оставаха без известие, а endpoint-ът пак
  // връщаше „успех". Сега броим реалната доставка.
  const targets = resources
    .map((r) => {
      const starts = byResource.get(r.id);
      if (!starts || starts.length === 0) return null;
      const firstAt = sofiaTimeLabel(starts[0]);
      const body = starts.length === 1 ? `Утре: 1 час, в ${firstAt}` : `Утре: ${starts.length} часа, първият в ${firstAt}`;
      return { id: r.id, name: r.name, count: starts.length, body };
    })
    .filter((t): t is { id: string; name: string; count: number; body: string } => t !== null);

  const results = await Promise.allSettled(
    targets.map((t) => notifyResource(t.id, { title: "Утрешен график", body: t.body, url: "/staff" })),
  );

  // Watchdog: fulfilled ≠ доставено. notifyResource не хвърля дори когато изпълнителят
  // няма НИТО ЕДИН работещ канал (0 push устройства + разкачен Telegram) — точно този
  // тих режим остави изпълнител без известия за нови записи (юли 2026). Изпълнител с
  // часове утре, до когото нищо не стигна → аларма до собственика още същата вечер.
  const silent: string[] = [];
  let notified = 0;
  results.forEach((res, i) => {
    const delivered = res.status === "fulfilled" && (res.value.push.sent > 0 || res.value.telegram);
    if (delivered) notified++;
    else silent.push(`${targets[i].name} — ${targets[i].count} ${targets[i].count === 1 ? "час" : "часа"} утре`);
  });

  if (silent.length > 0) {
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const advice = "Проверка: /staff/profile → Telegram връзка и известия на телефона.";
    await sendTelegramToAdmin(
      `⚠️ <b>Изпълнител без работещ канал за известия</b>\n${silent.map(esc).join("\n")}\n${esc(advice)}`,
    ).catch(() => false);
    await sendOpsAlert("Изпълнител без работещ канал за известия", [
      ...silent.map((s) => `${s} — утрешният дайджест не стигна доникъде.`),
      advice,
    ]).catch(() => false);
  }

  return NextResponse.json({ ok: true, notified, silent });
}
