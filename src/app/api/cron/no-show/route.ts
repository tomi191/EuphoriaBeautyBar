import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { authorizeCron } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

const GRACE_MIN = 15;

/** Маркира като „не се яви" потвърдените часове, чийто старт + grace (15 мин) е минал, без да са отбелязани като пристигнали/завършени. */
export async function GET(req: Request) {
  if (!authorizeCron(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cutoff = new Date(Date.now() - GRACE_MIN * 60000);

  // Покрива и pending (онлайн заявки, които никой не е потвърдил) — иначе
  // висят завинаги и изкривяват оборотната статистика.
  const rows = await db.query.bookings.findMany({
    where: (b, { and, inArray, lt }) => and(inArray(b.status, ["confirmed", "pending"]), lt(b.startAt, cutoff)),
  });

  let marked = 0;
  for (const b of rows) {
    await db
      .update(schema.bookings)
      .set({ status: "no_show", updatedAt: new Date() })
      .where(eq(schema.bookings.id, b.id));
    marked++;
  }

  return NextResponse.json({ ok: true, marked });
}
