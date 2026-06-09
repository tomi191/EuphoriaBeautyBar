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

type State = "unknown" | "on" | "off" | "unsupported";

export function StaffNotifications() {
  const [state, setState] = React.useState<State>("unknown");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setState(sub ? "on" : "off"))
      .catch(() => setState("unsupported"));
  }, []);

  async function enable() {
    const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!key) {
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
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
      });
      const json = sub.toJSON() as { keys?: { p256dh: string; auth: string } };
      await subscribeStaffPush({ endpoint: sub.endpoint, p256dh: json.keys!.p256dh, auth: json.keys!.auth });
      setState("on");
      toast.success("Известията са включени.");
    } catch {
      toast.error("Грешка при включване на известията.");
    } finally {
      setBusy(false);
    }
  }

  if (state === "unsupported") return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background p-5">
      <div className="flex items-center gap-2.5">
        {state === "on" ? <Bell className="size-5 text-primary" strokeWidth={1.6} /> : <BellOff className="size-5 text-muted-foreground" strokeWidth={1.6} />}
        <div>
          <p className="text-sm font-medium">Известия за нови записи</p>
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
