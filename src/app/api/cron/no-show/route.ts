import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { authorizeCron } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

const GRACE_MIN = 15;

/**
 * Приключва миналите часове ("settle"), вместо да помита всичко в „не се яви".
 *   1. confirmed/arrived с минал КРАЙ (endAt) → completed — часът се е състоял; пълни график + оборот.
 *   2. pending (непотвърдена онлайн заявка) с минал старт + grace → no_show — чисти висящи заявки.
 *
 * Защо: изпълнителите рядко маркират „Дойде/Приключих" ръчно. Старият вариант маркираше ВСЕКИ
 * непотбелязан потвърден час като no_show → фалшиви no_show, празен минал график и нулев оборот.
 * „Не се яви" вече е РЪЧНО решение на изпълнителя (по време/след часа), не автоматично.
 */
export async function GET(req: Request) {
  if (!authorizeCron(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const cutoff = new Date(now.getTime() - GRACE_MIN * 60000);

  // 1. Потвърдени/пристигнали часове, чийто край вече е минал → завършени.
  const toComplete = await db.query.bookings.findMany({
    where: (b, { and, inArray, lt }) => and(inArray(b.status, ["confirmed", "arrived"]), lt(b.endAt, now)),
    columns: { id: true },
  });
  let completed = 0;
  for (const b of toComplete) {
    await db.update(schema.bookings).set({ status: "completed", updatedAt: new Date() }).where(eq(schema.bookings.id, b.id));
    completed++;
  }

  // 2. Непотвърдени заявки, чийто старт + grace е минал → не се яви (чисти висящи).
  const toNoShow = await db.query.bookings.findMany({
    where: (b, { and, eq: eqq, lt }) => and(eqq(b.status, "pending"), lt(b.startAt, cutoff)),
    columns: { id: true },
  });
  let noShow = 0;
  for (const b of toNoShow) {
    await db.update(schema.bookings).set({ status: "no_show", updatedAt: new Date() }).where(eq(schema.bookings.id, b.id));
    noShow++;
  }

  return NextResponse.json({ ok: true, completed, marked: noShow });
}
