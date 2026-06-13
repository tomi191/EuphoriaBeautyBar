import webpush from "web-push";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

let configured = false;
function configure(): boolean {
  if (configured) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:reception@euphoriabeauty.eu", pub, priv);
  configured = true;
  return true;
}

/** Изпраща push известие до всички устройства на даден изпълнител. Не хвърля. */
export async function sendPushToResource(
  resourceId: string,
  payload: { title: string; body: string; url?: string },
): Promise<void> {
  if (!configure()) return;
  const subs = await db.query.pushSubscriptions.findMany({
    where: (s, { eq }) => eq(s.resourceId, resourceId),
  });
  const body = JSON.stringify(payload);
  await Promise.allSettled(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
          // Urgency: high → push услугата доставя дори при battery-saver/Doze (Xiaomi/MIUI и
          // Samsung One UI отлагат „normal" web-push). TTL 1 ден: задръж, ако устройството спи.
          { urgency: "high", TTL: 86400 },
        );
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        // Изтекъл/невалиден абонамент → почисти
        if (code === 404 || code === 410) {
          await db.delete(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.id, s.id));
        }
      }
    }),
  );
}
