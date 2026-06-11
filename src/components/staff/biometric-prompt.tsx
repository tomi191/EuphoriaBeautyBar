"use client";

import * as React from "react";
import { Fingerprint } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { passkeysEnabled, platformAuthenticatorAvailable } from "@/lib/passkey-support";

const DISMISS_KEY = "biometric-prompt-dismissed";

/**
 * Ненатрапчив банер на таблото, който предлага да си регистрираш отпечатък.
 * Self-gating: показва се само ако флагът е вдигнат, устройството поддържа,
 * не е dismiss-нат и потребителят още няма регистриран passkey.
 * Таблицата може да не съществува преди миграцията → catch → нищо.
 */
export function BiometricPrompt() {
  const [show, setShow] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    (async () => {
      if (!passkeysEnabled) return;
      if (!(await platformAuthenticatorAvailable())) return;
      if (localStorage.getItem(DISMISS_KEY) === "1") return;
      try {
        const res = await authClient.passkey.listUserPasskeys();
        if (res.data?.length) return; // вече има регистриран отпечатък
      } catch {
        return; // таблицата липсва (преди миграция) или мрежова грешка → нищо
      }
      if (active) setShow(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  if (!show) return null;

  async function enroll() {
    setBusy(true);
    try {
      const { error } = await authClient.passkey.addPasskey({ authenticatorAttachment: "platform" });
      if (error) {
        toast.error("Не се получи. Опитай пак.");
        setBusy(false);
        return;
      }
      toast.success("Готово - следващия път влез с отпечатък.");
      setShow(false);
    } catch {
      // Потребителят е отказал OS диалога.
      toast("Отказано");
      setBusy(false);
    }
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  }

  return (
    <div className="mb-4 rounded-2xl border border-border bg-cream p-4">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
          <Fingerprint className="size-5" strokeWidth={2} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight">Влизай по-бързо с пръстов отпечатък?</p>
          <div className="mt-2.5 flex items-center gap-2">
            <button
              type="button"
              onClick={enroll}
              disabled={busy}
              className="inline-flex h-9 items-center rounded-full bg-foreground px-4 text-xs font-semibold text-background transition-colors hover:bg-primary disabled:pointer-events-none disabled:opacity-60"
            >
              Да
            </button>
            <button
              type="button"
              onClick={dismiss}
              disabled={busy}
              className="inline-flex h-9 items-center rounded-full border border-border bg-background px-4 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-60"
            >
              Не сега
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
