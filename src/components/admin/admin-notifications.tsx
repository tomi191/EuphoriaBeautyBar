"use client";

import * as React from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { AdminNotificationsState } from "@/lib/admin/notifications";
import { getAdminNotifications, markAdminNotificationsSeen } from "@/lib/actions/admin-notifications";

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "току-що";
  if (min < 60) return `преди ${min} мин`;
  const h = Math.floor(min / 60);
  if (h < 24) return `преди ${h} ч`;
  const d = Math.floor(h / 24);
  if (d === 1) return "вчера";
  return `преди ${d} дни`;
}

export function AdminNotifications({ initial, size = "md" }: { initial: AdminNotificationsState; size?: "md" | "lg" }) {
  const [state, setState] = React.useState(initial);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(false);
  const [marking, setMarking] = React.useState(false);

  async function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) return;
    setLoading(true);
    setError(false);
    try {
      setState(await getAdminNotifications());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  async function markSeen() {
    setMarking(true);
    try {
      const res = await markAdminNotificationsSeen();
      setState((s) => ({ ...s, seenAt: res.at, unseen: 0 }));
    } catch {
      toast.error("Грешка. Опитай пак.");
    } finally {
      setMarking(false);
    }
  }

  const unseen = state.unseen;
  const seenAt = state.seenAt;

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          aria-label={unseen > 0 ? `Известия, ${unseen} нови` : "Известия"}
          style={{ touchAction: "manipulation" }}
          className={cn(
            "relative grid shrink-0 place-items-center rounded-md outline-none transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring",
            size === "lg" ? "size-11" : "size-10",
          )}
        >
          <Bell className="size-5" strokeWidth={1.6} aria-hidden="true" />
          {unseen > 0 && (
            <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-foreground px-1 text-[10px] font-medium leading-4 text-background">
              {unseen > 9 ? "9+" : unseen}
            </span>
          )}
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side="bottom"
          align="end"
          sideOffset={6}
          collisionPadding={12}
          className="z-[60] w-[22rem] max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-popover text-sm text-popover-foreground shadow-md"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2.5">
            <p className="font-medium">Известия</p>
            <button
              type="button"
              onClick={markSeen}
              disabled={unseen === 0 || marking}
              className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:pointer-events-none disabled:opacity-50"
            >
              Прочетени
            </button>
          </div>
          {loading && <p className="px-3 pt-2 text-xs text-muted-foreground">Зареждане…</p>}
          {error && <p className="px-3 pt-2 text-xs text-destructive">Не успях да заредя известията.</p>}
          {state.items.length === 0 ? (
            !loading && !error && (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                Няма нови записвания и откази през последните 7 дни.
              </p>
            )
          ) : (
            <ul className="max-h-[60vh] divide-y divide-border/70 overflow-y-auto">
              {state.items.map((n) => {
                const isNew = !seenAt || n.at > seenAt;
                return (
                  <li key={n.id}>
                    <Link
                      href={n.href}
                      onClick={() => setOpen(false)}
                      className="flex items-start gap-2 px-3 py-2.5 transition-colors hover:bg-secondary"
                    >
                      <span
                        aria-hidden="true"
                        className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", isNew ? "bg-foreground" : "bg-transparent")}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{n.title}</span>
                        <span className="block text-xs text-muted-foreground">{n.detail}</span>
                      </span>
                      <span className="shrink-0 pt-0.5 text-xs text-muted-foreground">{relativeTime(n.at)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
