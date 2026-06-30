import webpush from "web-push";
import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

const DEFAULT_SUBJECT = "mailto:reception@euphoriabeauty.eu";

/**
 * Конфигурира web-push при ВСЯКО повикване (евтино, идемпотентно). Не кешираме резултата
 * на module ниво: топъл serverless инстанс може да преживее ротация на ключ — кеширан флаг
 * би заключил стария ключ и известията тихо биха се отхвърляли. Връща false при липсваща
 * конфигурация (известието се пропуска, но логваме защо вместо да мълчим).
 */
function configure(): boolean {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) {
    console.warn("[push] VAPID конфигурацията липсва (pub=%s, priv=%s) — известията се пропускат", !!pub, !!priv);
    return false;
  }
  const subject = process.env.VAPID_SUBJECT || DEFAULT_SUBJECT;
  if (!subject.startsWith("mailto:") && !subject.startsWith("https://")) {
    console.warn("[push] VAPID_SUBJECT не е валиден (трябва mailto: или https:): %s", subject);
  }
  // Защитна проверка: derive-ни публичния ключ от частния и сравни. Несъответствие (грешна
  // ротация, разменени secrets) → push услугата мълчаливо отхвърля всичко. Само логваме —
  // не блокираме, за да не спрем работещи известия при ръбов случай в самата проверка.
  try {
    const ecdh = crypto.createECDH("prime256v1");
    ecdh.setPrivateKey(Buffer.from(priv.replace(/-/g, "+").replace(/_/g, "/"), "base64"));
    const derived = ecdh
      .getPublicKey()
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    if (derived !== pub) {
      console.error("[push] VAPID несъответствие: derive-натият public ключ ≠ VAPID_PUBLIC_KEY. Провери env-а (ротация/разменени ключове).");
    }
  } catch (e) {
    console.error("[push] VAPID валидацията се провали:", e instanceof Error ? e.message : String(e));
  }
  webpush.setVapidDetails(subject, pub, priv);
  return true;
}

/**
 * Изпраща push известие до всички устройства на даден изпълнител. Не хвърля.
 * Връща брой успешни/провалени, за да може повикващият (cron) да отчете реалната доставка.
 */
export async function sendPushToResource(
  resourceId: string,
  payload: { title: string; body: string; url?: string },
): Promise<{ sent: number; failed: number }> {
  if (!configure()) return { sent: 0, failed: 0 };
  const subs = await db.query.pushSubscriptions.findMany({
    where: (s, { eq }) => eq(s.resourceId, resourceId),
  });
  // Видимост: ресурс без нито един абонамент = известието се изпарява тихо. Логваме, за да
  // не остане невидимо (точно това скри, че изпълнител не получава известия за нови записи).
  if (subs.length === 0) {
    console.warn("[push] няма абонирани устройства за resource %s — известието се пропуска", resourceId);
    return { sent: 0, failed: 0 };
  }
  const body = JSON.stringify(payload);
  // W3C Push лимит ~4KB (некриптиран payload). Текущите са ~200B; пазим срещу бъдеща регресия,
  // която иначе би върнала тих 413 за всяко устройство.
  if (body.length > 4000) {
    console.error("[push] payload %dB надхвърля 4KB за resource %s — пропуснат", body.length, resourceId);
    return { sent: 0, failed: subs.length };
  }
  let sent = 0;
  let failed = 0;
  await Promise.allSettled(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
          // Urgency high → доставя дори при battery-saver/Doze (Xiaomi/MIUI, Samsung One UI
          // отлагат „normal" web-push). TTL 1 ден: задръж, ако устройството спи.
          { urgency: "high", TTL: 86400 },
        );
        sent++;
      } catch (err) {
        failed++;
        const code = (err as { statusCode?: number }).statusCode;
        // 404/410 = изтекъл, 400 = невалиден абонамент → почисти. Останалите (429/5xx) са
        // преходни → задръж, но логвай за видимост (иначе тихо гният в базата).
        if (code === 404 || code === 410 || code === 400) {
          await db.delete(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.id, s.id));
        } else {
          console.warn("[push] изпращането се провали (code=%s) към …%s", code, s.endpoint.slice(-16));
        }
      }
    }),
  );
  return { sent, failed };
}

/**
 * Изпраща ТЕСТОВО известие до ВСИЧКИ абонирани устройства (за разлика от
 * sendPushToResource, не филтрира по изпълнител). Така админ бутонът достига и до
 * устройството, на което се тества, дори то да не е вързано към ресурс. Изтеклите
 * абонаменти (404/410/400) се чистят. Не хвърля; връща разбивка за UI обратна връзка.
 */
export async function sendTestPushToAll(
  payload: { title: string; body: string; url?: string },
): Promise<{ sent: number; failed: number; expired: number; total: number }> {
  if (!configure()) return { sent: 0, failed: 0, expired: 0, total: 0 };
  const subs = await db.query.pushSubscriptions.findMany();
  if (subs.length === 0) return { sent: 0, failed: 0, expired: 0, total: 0 };
  const body = JSON.stringify(payload);
  let sent = 0;
  let failed = 0;
  let expired = 0;
  await Promise.allSettled(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
          // Същите параметри като реален „нов запис" — тестът минава по идентичен FCM път.
          { urgency: "high", TTL: 86400, topic: "newbooking" },
        );
        sent++;
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410 || code === 400) {
          await db.delete(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.id, s.id));
          expired++;
        } else {
          failed++;
          console.warn("[push] тест: изпращането се провали (code=%s) към …%s", code, s.endpoint.slice(-16));
        }
      }
    }),
  );
  return { sent, failed, expired, total: subs.length };
}
