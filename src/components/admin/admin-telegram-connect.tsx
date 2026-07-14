"use client";

import * as React from "react";
import { Send, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getAdminTelegramLink, disconnectAdminTelegram } from "@/lib/actions/admin-telegram";
import { Button } from "@/components/ui/button";

/**
 * Свързване на АДМИН Telegram канала (огледало на staff TelegramConnect, но върху
 * siteSettings): собственикът получава известие за всеки нов онлайн запис/отказ,
 * при всички изпълнители. Deep link → бот → webhook записва chat_id.
 */
export function AdminTelegramConnect() {
  const [connected, setConnected] = React.useState<boolean | null>(null);
  const [url, setUrl] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState(false);

  const loadLink = React.useCallback(() => {
    setError(false);
    getAdminTelegramLink()
      .then((s) => {
        setConnected(s.connected);
        setUrl(s.url);
      })
      .catch(() => setError(true));
  }, []);

  React.useEffect(() => {
    loadLink();
  }, [loadLink]);

  // Свързването приключва в Telegram → при връщане в таба пре-проверяваме статуса.
  React.useEffect(() => {
    if (connected) return;
    const recheck = () => {
      if (document.visibilityState !== "visible") return;
      getAdminTelegramLink().then((s) => { setConnected(s.connected); if (!s.connected) setUrl(s.url); }).catch(() => {});
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
      await disconnectAdminTelegram();
      setConnected(false);
      const s = await getAdminTelegramLink();
      setUrl(s.url);
      toast.success("Админ каналът е разсвързан.");
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
          <p className="text-sm font-medium leading-tight">Telegram — админ канал</p>
          <p className="text-xs text-muted-foreground">
            {connected
              ? "Свързан — получаваш всеки нов онлайн запис и отказ"
              : "Известие при всеки нов онлайн запис/отказ, при всички изпълнители"}
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
