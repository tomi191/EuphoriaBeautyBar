"use client";

import * as React from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { setRentalOpen } from "@/lib/actions/positions";

/** Глобален превключвател — отдаваме ли място под наем. При изключено /karieri показва „няма свободни места". */
export function RentalOpenToggle({ initial }: { initial: boolean }) {
  const [open, setOpen] = React.useState(initial);
  const [pending, setPending] = React.useState(false);

  async function handle(next: boolean) {
    setOpen(next);
    setPending(true);
    try {
      await setRentalOpen(next);
      toast.success(next ? "Страницата под наем е активна." : "Страницата под наем е скрита.");
    } catch {
      setOpen(!next);
      toast.error("Грешка при запазване.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center justify-between rounded-2xl border border-border bg-background p-5">
      <div>
        <Label htmlFor="rental-open" className="text-base font-medium">Отдаваме място под наем</Label>
        <p className="mt-1 text-sm text-muted-foreground">
          Когато е изключено, /karieri показва „в момента няма свободни места", независимо от позициите.
        </p>
      </div>
      <Switch id="rental-open" checked={open} disabled={pending} onCheckedChange={handle} />
    </div>
  );
}
