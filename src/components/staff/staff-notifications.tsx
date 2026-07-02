"use client";

import * as React from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { subscribeStaffPush, unsubscribeStaffPush } from "@/lib/actions/push";
import { Button } from "@/components/ui/button";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  let raw: string;
  try {
    raw = atob(base64);
  } catch {
    // Повреден/отрязан VAPID ключ → дай ясна грешка вместо суров SyntaxError от atob.
    throw new Error("Невалиден VAPID ключ (повреден base64url)");
  }
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}
function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
// Версията се ИЗВЕЖДА от самия ключ → при ротация (нов deploy с нов NEXT_PUBLIC_VAPID) тя се
// сменя автоматично и авто-изцелението пре-абонира всички устройства, без ръчен bump (който
// лесно се забравя → устройствата тихо остават на стария ключ и известията спират).
const KEY_VERSION = VAPID_KEY ? "k-" + VAPID_KEY.slice(-12) : "none";

/**
 * Абонира устройството с ТЕКУЩИЯ VAPID ключ — като vrachka: викай subscribe() ДИРЕКТНО.
 * Ако вече има абонамент със същия ключ, браузърът връща него (no-op). Отписваме САМО
 * при реален конфликт на ключове (InvalidStateError „different applicationServerKey"),
 * после опитваме пак веднъж. Безусловното отписване хвърляше „AbortError: push service
 * error" (race при unsubscribe→subscribe) — затова го махнахме.
 */
async function subscribeWithCurrentKey(reg: ServiceWorkerRegistration): Promise<void> {
  if (!VAPID_KEY) throw new Error("NEXT_PUBLIC_VAPID_PUBLIC_KEY липсва");
  const opts: PushSubscriptionOptionsInit = {
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_KEY) as BufferSource,
  };
  let sub: PushSubscription;
  try {
    sub = await reg.pushManager.subscribe(opts);
  } catch (err) {
    // Само при конфликт на ключове: отпиши стария абонамент и опитай пак (веднъж).
    if (err instanceof DOMException && err.name === "InvalidStateError") {
      const old = await reg.pushManager.getSubscription();
      const oldEndpoint = old?.endpoint;
      if (old) await old.unsubscribe();
      try {
        sub = await reg.pushManager.subscribe(opts);
      } catch (retryErr) {
        // Браузърът вече няма абонамент; ако DB пази стария → почисти, за да не остане orphan.
        if (oldEndpoint) await unsubscribeStaffPush(oldEndpoint).catch(() => {});
        throw retryErr;
      }
    } else {
      throw err;
    }
  }
  const json = sub.toJSON() as { keys?: { p256dh: string; auth: string } };
  await subscribeStaffPush({ endpoint: sub.endpoint, p256dh: json.keys!.p256dh, auth: json.keys!.auth });
}

type State = "unknown" | "on" | "off" | "unsupported";

export function StaffNotifications() {
  const [state, setState] = React.useState<State>("unknown");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }
    if (isIOS() && !isStandalone()) {
      // iOS дава Web Push само на инсталирано PWA (Add to Home Screen). В Safari таб
      // subscribe() гърми → скрий тоггъла, за да не подведем потребителя да „включи" нещо,
      // което няма да достави. install-banner-ът вече подканва за инсталация.
      setState("unsupported");
      return;
    }
    // SW вече е регистриран от layout-а (SwRegister) — ползвай ready, не нов register.
    navigator.serviceWorker.ready
      .then(async (reg) => {
        const sub = await reg.pushManager.getSubscription();
        if (!sub) {
          setState("off");
          return;
        }
        // Permission може да е отнето в настройките след абониране → отрази реалното състояние,
        // иначе UI лъже „включено", а известия не идват.
        if (typeof Notification !== "undefined" && Notification.permission !== "granted") {
          setState("off");
          return;
        }
        // Еднократно авто-изцеление: ако устройството още е на стар VAPID ключ (известията
        // тихо не идваха), пре-абонирай с текущия — без да караме потребителя да кликва пак.
        if (
          typeof Notification !== "undefined" &&
          Notification.permission === "granted" &&
          localStorage.getItem("push-key-v") !== KEY_VERSION
        ) {
          try {
            await subscribeWithCurrentKey(reg);
            localStorage.setItem("push-key-v", KEY_VERSION);
          } catch {
            /* ако се провали — остави стария абонамент, не чупи UI-то */
          }
        } else {
          // Споделено устройство: пре-вържи съществуващия абонамент към ТЕКУЩИЯ акаунт
          // (subscribeStaffPush upsert-ва endpoint→resourceId). Иначе известията за нови
          // записи продължават да отиват при предишния влязъл на този таблет.
          try {
            const json = sub.toJSON() as { keys?: { p256dh: string; auth: string } };
            if (json.keys) await subscribeStaffPush({ endpoint: sub.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth });
          } catch {
            /* re-bind провал не бива да чупи UI-то */
          }
        }
        setState("on");
      })
      .catch(() => setState("unsupported"));
  }, []);

  async function enable() {
    if (!VAPID_KEY) {
      toast.error("Известията не са конфигурирани.");
      return;
    }
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        toast.error("Известията са блокирани в браузъра.");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      await subscribeWithCurrentKey(reg);
      localStorage.setItem("push-key-v", KEY_VERSION);
      setState("on");
      toast.success("Известията са включени.");
    } catch (err) {
      console.error("[push] enable failed:", err);
      const e = err as Error;
      const msg = e?.message ?? "";
      const name = e?.name ?? "";
      if (/push service|abort|notallowed|fcm|registration|denied|service/i.test(msg + " " + name)) {
        // Регистрацията към Google FCM е блокирана — Brave спира Google push по подразбиране,
        // adblocker/privacy разширение блокира fcmregistrations.googleapis.com. Грешката идва
        // под различни имена (AbortError, NotAllowedError) → затова матчваме по-широко.
        toast.error(
          "Браузърът блокира Google известията. Ако е Brave — пусни 'Use Google services for push messaging' и рестартирай. Или отвори в Chrome / прозорец без разширения.",
        );
      } else if (/невалиден vapid/i.test(msg)) {
        toast.error("Грешка в конфигурацията на известията. Свържи се с поддръжката.");
      } else {
        toast.error("Грешка при включване: " + (msg || "неизвестна"));
      }
    } finally {
      setBusy(false);
    }
  }

  if (state === "unsupported") return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3.5 py-2.5">
      <div className="flex items-center gap-2.5">
        {state === "on" ? <Bell className="size-4 text-primary" strokeWidth={1.6} /> : <BellOff className="size-4 text-muted-foreground" strokeWidth={1.6} />}
        <div>
          <p className="text-sm font-medium leading-tight">Известия за нови записи</p>
          <p className="text-xs text-muted-foreground">
            {state === "on" ? "Включени на това устройство" : "Получавай известие при нов час"}
          </p>
        </div>
      </div>
      {state !== "on" && (
        <Button onClick={enable} disabled={busy || state === "unknown"} size="sm" className="rounded-full">
          {busy ? <Loader2 className="size-4 animate-spin" /> : "Включи"}
        </Button>
      )}
    </div>
  );
}
