"use client";

import * as React from "react";
import { Send, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getTelegramLink, disconnectTelegram } from "@/lib/actions/telegram";
import { Button } from "@/components/ui/button";

/**
 * Свързване на Telegram за известия. При несвързан изпълнител зарежда deep link
 * (t.me/<bot>?start=<token>) и го показва като директен линк — натискане отваря бота,
 * Start задейства webhook-а, който записва chat_id. По-надеждно от web push на Android.
 */
export function TelegramConnect({ initialConnected }: { initialConnected: boolean }) {
  const [connected, setConnected] = React.useState(initialConnected);
  const [url, setUrl] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState(false);

  const loadLink = React.useCallback(() => {
    setError(false);
    getTelegramLink()
      .then((s) => {
        setConnected(s.connected);
        setUrl(s.url);
      })
      .catch(() => setError(true)); // без това провалът остава вечен spinner без съобщение
  }, []);

  React.useEffect(() => {
    if (initialConnected) return;
    loadLink();
  }, [initialConnected, loadLink]);

  // Свързването става в Telegram (webhook записва chat_id сървърно). Когато потребителят
  // се върне в таба, пре-проверяваме статуса → показва „Свързан" без ръчно презареждане.
  React.useEffect(() => {
    if (connected) return;
    const recheck = () => {
      if (document.visibilityState !== "visible") return;
      getTelegramLink().then((s) => { setConnected(s.connected); if (!s.connected) setUrl(s.url); }).catch(() => {});
    };
    window.addEventListener("focus", recheck);
    document.addEventListener("visibilitychange", recheck);
    return () => {
      window.removeEventListener("focus", recheck);
      document.removeEventListener("visibilitychange", recheck);
    };
  }, [connected]);

  async function disconnect() {
    setBusy(true);
    try {
      await disconnectTelegram();
      setConnected(false);
      const s = await getTelegramLink();
      setUrl(s.url);
      toast.success("Telegram е разсвързан.");
    } catch {
      toast.error("Грешка. Опитай пак.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3.5 py-2.5">
      <div className="flex items-center gap-2.5">
        {connected ? (
          <Check className="size-4 shrink-0 text-primary" strokeWidth={2.2} />
        ) : (
          <Send className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.6} />
        )}
        <div>
          <p className="text-sm font-medium leading-tight">Telegram известия</p>
          <p className="text-xs text-muted-foreground">
            {connected ? "Свързан — получаваш известия в Telegram" : "Най-надеждният канал за нови записи"}
          </p>
        </div>
      </div>
      {connected ? (
        <Button onClick={disconnect} disabled={busy} size="sm" variant="ghost" className="rounded-full text-muted-foreground">
          {busy ? <Loader2 className="size-4 animate-spin" /> : "Разсвържи"}
        </Button>
      ) : url ? (
        <Button asChild size="sm" className="rounded-full">
          <a href={url} target="_blank" rel="noopener noreferrer">
            Свържи
          </a>
        </Button>
      ) : error ? (
        <Button onClick={loadLink} size="sm" variant="ghost" className="rounded-full">
          Опитай пак
        </Button>
      ) : (
        <Button disabled size="sm" className="rounded-full">
          <Loader2 className="size-4 animate-spin" />
        </Button>
      )}
    </div>
  );
}
