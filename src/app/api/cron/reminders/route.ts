import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { sendReminder } from "@/lib/email/booking";
import { authorizeCron } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

/** Напомняне за предстоящи часове (в следващите ~30ч), които още нямат изпратено напомняне. */
export async function GET(req: Request) {
  if (!authorizeCron(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const horizon = new Date(now.getTime() + 30 * 3600000);

  const rows = await db.query.bookings.findMany({
    where: (b, { and, eq, gt, lt, isNull }) =>
      and(eq(b.status, "confirmed"), isNull(b.reminderSentAt), gt(b.startAt, now), lt(b.startAt, horizon)),
  });

  let sent = 0;
  for (const b of rows) {
    if (!b.clientId) continue;
    const [client, resource] = await Promise.all([
      db.query.clients.findFirst({ where: (c, { eq }) => eq(c.id, b.clientId as string) }),
      db.query.resources.findFirst({ where: (r, { eq }) => eq(r.id, b.resourceId) }),
    ]);
    if (!client?.email) continue;
    await sendReminder(client.email, {
      clientName: client.name,
      serviceName: b.serviceName,
      performerName: resource?.name ?? "екипа на Euphoria",
      start: b.startAt,
    });
    await db.update(schema.bookings).set({ reminderSentAt: new Date() }).where(eq(schema.bookings.id, b.id));
    sent++;
  }

  return NextResponse.json({ ok: true, sent });
}
