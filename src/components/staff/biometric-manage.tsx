"use client";

import * as React from "react";
import { Fingerprint, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { passkeysEnabled, platformAuthenticatorAvailable } from "@/lib/passkey-support";

type Passkey = { id: string };

/**
 * Управление на отпечатъка от профила.
 * Self-gating: рендва null ако флагът е свален. Ако устройството не поддържа
 * вграден authenticator, показва кратка бележка. Таблицата може да липсва преди
 * миграцията → try/catch навсякъде около passkey заявките.
 */
export function BiometricManage() {
  const [supported, setSupported] = React.useState<boolean | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [passkeys, setPasskeys] = React.useState<Passkey[]>([]);

  const loadPasskeys = React.useCallback(async () => {
    try {
      const res = await authClient.passkey.listUserPasskeys();
      setPasskeys((res.data as Passkey[] | null) ?? []);
    } catch {
      // Таблицата липсва (преди миграция) или мрежова грешка → третираме като 0.
      setPasskeys([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let active = true;
    (async () => {
      if (!passkeysEnabled) {
        if (active) setSupported(false);
        return;
      }
      const ok = await platformAuthenticatorAvailable();
      if (!active) return;
      setSupported(ok);
      if (ok) {
        await loadPasskeys();
      } else {
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [loadPasskeys]);

  // Флагът е свален → нищо в профила.
  if (!passkeysEnabled) return null;

  // Устройството не поддържа → тиха бележка (флагът е вдигнат, но няма authenticator).
  if (supported === false) {
    return <p className="text-xs text-muted-foreground">Не се поддържа на това устройство.</p>;
  }

  async function add() {
    setBusy(true);
    try {
      const { error } = await authClient.passkey.addPasskey({ authenticatorAttachment: "platform" });
      if (error) {
        toast.error("Не се получи. Опитай пак.");
        return;
      }
      toast.success("Готово - влизай с отпечатък.");
      await loadPasskeys();
    } catch {
      toast("Отказано");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      const { error } = await authClient.passkey.deletePasskey({ id });
      if (error) {
        toast.error("Грешка при премахване.");
        return;
      }
      toast.success("Премахнато.");
      await loadPasskeys();
    } catch {
      toast.error("Грешка при премахване.");
    } finally {
      setBusy(false);
    }
  }

  const hasPasskey = passkeys.length > 0;

  return (
    <div className="rounded-xl border border-border bg-background p-3.5">
      {loading || supported === null ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Зареждане…
        </div>
      ) : hasPasskey ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                <Fingerprint className="size-5" strokeWidth={2} aria-hidden="true" />
              </div>
              {/* Passkey-ите са за акаунта (не за конкретно устройство) → показваме брой. */}
              <p className="text-sm font-medium">
                Биометрия включена{passkeys.length > 1 ? ` · ${passkeys.length} устройства` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => remove(passkeys[0].id)}
              disabled={busy}
              className="inline-flex h-11 shrink-0 items-center rounded-full border border-border bg-background px-4 text-xs font-medium text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive disabled:pointer-events-none disabled:opacity-60"
            >
              Премахни
            </button>
          </div>
          {/* Всяко устройство има собствен отпечатък → позволи добавяне и на ново устройство. */}
          <button
            type="button"
            onClick={add}
            disabled={busy}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-border text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Fingerprint className="size-4" aria-hidden="true" />}
            Добави и това устройство
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={add}
          disabled={busy}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-foreground text-sm font-semibold text-background transition-colors hover:bg-primary active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
        >
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Добавяне
            </>
          ) : (
            <>
              <Fingerprint className="size-4" strokeWidth={2} aria-hidden="true" /> Добави този телефон
            </>
          )}
        </button>
      )}
    </div>
  );
}
