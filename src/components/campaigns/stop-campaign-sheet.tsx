"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { stopCampaignAsAdmin, stopMyCampaign } from "@/lib/actions/campaigns";
import { CAMPAIGN_TEXT, NOTE_MAX, STOP_REASONS, type StopReasonKey } from "@/lib/campaigns/rules";
import { cn } from "@/lib/utils";

/**
 * Листът «Спри» (кадър админ-telegram-спри-390, екран 4; Саиф 4.61–4.66): причината е задължителна, при «Друго» ред
 * до 60 знака. Специалистът спира своята, Снежана (as="admin") всяка.
 */
export function StopCampaignSheet({
  id,
  title,
  as,
  compact,
}: {
  id: string;
  title: string;
  as: "staff" | "admin";
  /** Малкият бутон «Спри» в реда на администрацията. */
  compact?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState<StopReasonKey | null>(null);
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function stop() {
    if (!reason || busy) return;
    if (reason === "other" && !note.trim()) {
      setError(CAMPAIGN_TEXT.stopOtherEmpty);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const n = reason === "other" ? note : null;
      const r = as === "admin" ? await stopCampaignAsAdmin(id, reason, n) : await stopMyCampaign(id, reason, n);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setOpen(false);
      toast.success(CAMPAIGN_TEXT.stopDone);
      router.refresh();
    } catch (e) {
      console.error("[campaigns] спирането падна:", e);
      setError("Няма връзка. Промоцията не е спряна. Опитай пак.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        if (busy) return;
        setOpen(o);
        if (!o) {
          setReason(null);
          setNote("");
          setError(null);
        }
      }}
    >
      <Dialog.Trigger asChild>
        {compact ? (
          <button
            type="button"
            aria-label={`Спри промоцията „${title}“`}
            className="inline-flex h-11 min-w-[5.5rem] items-center justify-center rounded-full border border-border bg-background px-6 text-base transition-colors hover:border-foreground/40"
          >
            Спри
          </button>
        ) : (
          <button
            type="button"
            className="inline-flex h-14 w-full items-center justify-center rounded-full border-2 border-destructive-line text-lg font-medium text-destructive-line transition-colors hover:bg-destructive-line/5 lg:h-[4.5rem] lg:text-[2rem]"
          >
            {CAMPAIGN_TEXT.stop}
          </button>
        )}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          className="fixed inset-x-0 bottom-0 z-50 max-h-[90dvh] overflow-y-auto rounded-t-3xl bg-background px-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-3 shadow-xl data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[28rem] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:pt-6"
          aria-describedby="stop-text"
        >
          <span className="mx-auto mb-5 block h-1 w-10 rounded-full bg-border sm:hidden" aria-hidden />
          <Dialog.Title className="font-display text-[22px] font-semibold leading-tight">{CAMPAIGN_TEXT.stopTitle}</Dialog.Title>
          <p id="stop-text" className="mt-3 text-[17px] leading-snug text-muted-foreground">
            {CAMPAIGN_TEXT.stopText}
          </p>
          <fieldset className="mt-6">
            <legend className="font-display text-[19px] font-semibold">{CAMPAIGN_TEXT.stopWhy}</legend>
            <div className="mt-2" role="radiogroup">
              {STOP_REASONS.map((r) => (
                <label key={r.key} className="flex min-h-12 cursor-pointer items-center gap-4 text-[17px]">
                  <input
                    type="radio"
                    name={`stop-${id}`}
                    value={r.key}
                    checked={reason === r.key}
                    onChange={() => {
                      setReason(r.key);
                      setError(null);
                    }}
                    className="size-6 accent-primary"
                  />
                  {r.label}
                </label>
              ))}
            </div>
            {reason === "other" && (
              <input
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))}
                maxLength={NOTE_MAX}
                aria-label="Причината"
                className="mt-2 h-12 w-full rounded-xl border border-input bg-background px-4 text-base"
                autoFocus
              />
            )}
          </fieldset>
          {error && (
            <p role="alert" className="mt-3 text-[15px] text-destructive">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={stop}
            disabled={!reason || busy}
            className={cn(
              "mt-6 inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-destructive-deep text-lg font-semibold text-white transition-opacity",
              (!reason || busy) && "opacity-50",
            )}
          >
            {busy && <Loader2 className="size-5 animate-spin" aria-hidden />}
            {CAMPAIGN_TEXT.stop}
          </button>
          <Dialog.Close className="mx-auto mt-2 flex h-12 items-center px-3 text-[17px] text-primary underline underline-offset-4">
            {CAMPAIGN_TEXT.stopKeep}
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
