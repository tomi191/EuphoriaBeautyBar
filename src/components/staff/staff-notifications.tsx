"use client";

import * as React from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { subscribeStaffPush } from "@/lib/actions/push";
import { Button } from "@/components/ui/button";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
// Bump-ни при смяна на VAPID ключа → форсира еднократно пре-абониране на всички устройства.
const KEY_VERSION = "2026-06";

/**
 * Абонира устройството с ТЕКУЩИЯ VAPID ключ. Първо отписва всеки съществуващ абонамент —
 * иначе, ако той е създаден със стар ключ, pushManager.subscribe хвърля
 * „A subscription with a different applicationServerKey already exists", а дори да мине,
 * стар ключ значи че FCM приема (201), но устройството тихо дропва известието.
 */
async function subscribeWithCurrentKey(reg: ServiceWorkerRegistration): Promise<void> {
  if (!VAPID_KEY) throw new Error("NEXT_PUBLIC_VAPID_PUBLIC_KEY липсва");
  const existing = await reg.pushManager.getSubscription();
  if (existing) await existing.unsubscribe();
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_KEY) as BufferSource,
  });
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
    // SW вече е регистриран от layout-а (SwRegister) — ползвай ready, не нов register.
    navigator.serviceWorker.ready
      .then(async (reg) => {
        const sub = await reg.pushManager.getSubscription();
        if (!sub) {
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
      // Покажи реалната причина (напр. applicationServerKey конфликт) — иначе летим слепи.
      console.error("[push] enable failed:", err);
      toast.error("Грешка при включване: " + ((err as Error)?.message ?? "неизвестна"));
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
