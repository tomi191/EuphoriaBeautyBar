import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { sendReviewRequest } from "@/lib/email/booking";
import { authorizeCron } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

/** Покана за отзив след завършен час (на клиенти с имейл, които още не са канени). */
export async function GET(req: Request) {
  if (!authorizeCron(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const reviewUrl = process.env.GOOGLE_REVIEW_URL || undefined;

  const rows = await db.query.bookings.findMany({
    where: (b, { and, eq, isNull }) => and(eq(b.status, "completed"), isNull(b.reviewRequestedAt)),
  });

  let sent = 0;
  for (const b of rows) {
    if (!b.clientId) continue;
    const [client, resource] = await Promise.all([
      db.query.clients.findFirst({ where: (c, { eq }) => eq(c.id, b.clientId as string) }),
      db.query.resources.findFirst({ where: (r, { eq }) => eq(r.id, b.resourceId) }),
    ]);
    // Маркираме винаги, за да не опитваме безкрайно; имейл само ако има адрес.
    if (client?.email) {
      await sendReviewRequest(client.email, {
        clientName: client.name,
        serviceName: b.serviceName,
        performerName: resource?.name ?? "екипа на Euphoria",
        start: b.startAt,
        reviewUrl,
      });
      sent++;
    }
    await db.update(schema.bookings).set({ reviewRequestedAt: new Date() }).where(eq(schema.bookings.id, b.id));
  }

  return NextResponse.json({ ok: true, sent });
}
