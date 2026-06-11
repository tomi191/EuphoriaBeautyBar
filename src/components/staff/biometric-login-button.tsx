"use client";

import * as React from "react";
import { Fingerprint } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { passkeysEnabled, platformAuthenticatorAvailable } from "@/lib/passkey-support";

/**
 * Бутон „Влез с отпечатък" над паролната форма.
 * Self-gating: рендва null освен ако флагът е вдигнат И устройството поддържа
 * вграден authenticator. Паролата остава fallback — този бутон само добавя опция.
 */
export function BiometricLoginButton() {
  const [show, setShow] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    (async () => {
      if (!passkeysEnabled) return;
      const supported = await platformAuthenticatorAvailable();
      if (active && supported) setShow(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  if (!show) return null;

  async function handleClick() {
    setBusy(true);
    try {
      await authClient.signIn.passkey({
        fetchOptions: {
          onSuccess() {
            window.location.href = "/staff";
          },
          onError() {
            toast.error("Не се получи. Опитай с парола.");
            setBusy(false);
          },
        },
      });
    } catch {
      // Потребителят е отказал OS диалога (или браузърът е прекъснал WebAuthn).
      toast("Отказано");
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-foreground text-sm font-medium text-background transition-colors hover:bg-primary disabled:pointer-events-none disabled:opacity-60"
      >
        <Fingerprint className="size-4" strokeWidth={2} aria-hidden="true" />
        Влез с отпечатък
      </button>
      <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        или с парола
        <span className="h-px flex-1 bg-border" />
      </div>
    </>
  );
}
