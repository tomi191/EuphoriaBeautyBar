"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { markArrived, markCompleted, cancelBooking } from "@/lib/actions/bookings";

export function BookingRowActions({ id, status }: { id: string; status: string }) {
  const [busy, setBusy] = React.useState(false);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } catch {
      toast.error("Грешка.");
    } finally {
      setBusy(false);
    }
  }

  const done = status === "completed" || status === "cancelled" || status === "no_show";

  return (
    <div className="flex justify-end gap-1">
      {status === "confirmed" && (
        <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => markArrived(id))}>
          Дойде
        </Button>
      )}
      {(status === "arrived" || status === "confirmed") && (
        <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => markCompleted(id))}>
          Завършен
        </Button>
      )}
      {!done && (
        <Button
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={() => {
            if (confirm("Да откажа ли този час?")) run(() => cancelBooking(id));
          }}
        >
          Откажи
        </Button>
      )}
    </div>
  );
}
