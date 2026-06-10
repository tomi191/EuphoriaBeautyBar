"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, UserX } from "lucide-react";
import { toast } from "sonner";
import { markMyArrived, markMyCompleted, markMyNoShow } from "@/lib/actions/staff-bookings";

type ActionKey = "arrived" | "completed" | "no_show";

/**
 * Компактни статус бутони за час в графика на работника:
 * confirmed -> [Дойде] [Не дойде]; arrived -> [Приключих].
 * Рендерира се от сървъра само за днешни/минали часове.
 */
export function BookingStatusActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<ActionKey | null>(null);

  async function run(key: ActionKey) {
    setBusy(key);
    try {
      if (key === "arrived") await markMyArrived(id);
      else if (key === "completed") await markMyCompleted(id);
      else await markMyNoShow(id);
      // Леко хаптично потвърждение на успешното действие.
      if (typeof navigator !== "undefined") navigator.vibrate?.(10);
      toast.success(
        key === "arrived" ? "Отбелязано: клиентът дойде." : key === "completed" ? "Часът е приключен." : "Отбелязано: не дойде.",
      );
      router.refresh();
    } catch {
      toast.error("Грешка. Опитай пак.");
      setBusy(null);
    }
  }

  if (status === "confirmed") {
    return (
      <div className="mt-2 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => run("arrived")}
          disabled={busy !== null}
          className="inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1.5 text-[11px] font-semibold text-background transition-all hover:bg-primary active:scale-[0.98] disabled:opacity-60"
        >
          {busy === "arrived" ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" strokeWidth={2.5} />}
          Дойде
        </button>
        <button
          type="button"
          onClick={() => run("no_show")}
          disabled={busy !== null}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-all hover:border-destructive/40 hover:text-destructive active:scale-[0.98] disabled:opacity-60"
        >
          {busy === "no_show" ? <Loader2 className="size-3 animate-spin" /> : <UserX className="size-3" strokeWidth={2.2} />}
          Не дойде
        </button>
      </div>
    );
  }

  if (status === "arrived") {
    return (
      <div className="mt-2">
        <button
          type="button"
          onClick={() => run("completed")}
          disabled={busy !== null}
          className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-background transition-all hover:bg-foreground active:scale-[0.98] disabled:opacity-60"
        >
          {busy === "completed" ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" strokeWidth={2.5} />}
          Приключих
        </button>
      </div>
    );
  }

  return null;
}
