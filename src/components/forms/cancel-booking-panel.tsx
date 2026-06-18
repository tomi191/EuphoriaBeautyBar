"use client";

import * as React from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cancelOwnBooking } from "@/lib/actions/cancel-booking";

export function CancelBookingPanel({ id, canCancel, note }: { id: string; canCancel: boolean; note?: string }) {
  const [done, setDone] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState("");

  if (!canCancel) {
    return <p className="text-sm text-muted-foreground">{note}</p>;
  }
  if (done) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-mint/30 px-4 py-3 text-sm font-medium text-foreground">
        <CheckCircle2 className="size-5 text-primary" /> Часът е отменен. Благодарим, че ни уведоми.
      </div>
    );
  }

  async function confirm() {
    setBusy(true);
    setErr("");
    try {
      const res = await cancelOwnBooking(id);
      if (res.ok) setDone(true);
      else setErr(res.error ?? "Грешка при отмяна.");
    } catch {
      setErr("Грешка при отмяна. Опитай пак или се обади.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Button
        onClick={confirm}
        disabled={busy}
        className="h-12 w-full rounded-full bg-destructive text-base text-white hover:bg-destructive/90"
      >
        {busy ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Отменям…
          </>
        ) : (
          "Потвърди отмяната"
        )}
      </Button>
      {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
    </div>
  );
}
