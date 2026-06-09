"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { cancelMyBooking } from "@/lib/actions/staff-bookings";

export function StaffCancelButton({ id }: { id: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  async function cancel() {
    setBusy(true);
    try {
      await cancelMyBooking(id);
      toast.success("Часът е отменен.");
      router.refresh();
    } catch {
      toast.error("Грешка.");
      setBusy(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <button onClick={cancel} disabled={busy} className="rounded-full bg-destructive px-2.5 py-1 text-[11px] font-semibold text-white">
          {busy ? <Loader2 className="size-3 animate-spin" /> : "Потвърди"}
        </button>
        {!busy && (
          <button onClick={() => setConfirming(false)} className="text-[11px] font-medium text-muted-foreground">
            Не
          </button>
        )}
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-destructive"
    >
      <X className="size-3.5" /> Отмени
    </button>
  );
}
