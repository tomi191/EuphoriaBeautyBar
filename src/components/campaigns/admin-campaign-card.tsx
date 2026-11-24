"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";
import { approveCampaign, returnCampaign } from "@/lib/actions/campaigns";
import { formatEuro } from "@/lib/booking/price";
import type { CampaignView } from "@/lib/campaigns/core";
import { NOTE_MAX, RETURN_REASONS, type ReturnReasonKey } from "@/lib/campaigns/rules";
import { cn } from "@/lib/utils";

/**
 * Картата за одобрение при Снежана (№11, кадри кръг-2/админ-промоции-1440 и админ-telegram-спри-390, екран 2):
 * «Одобри», «Върни» и причините като бутони (поне 44 px, Канопус), по желание ред до специалиста.
 * ?return=<id> (бутонът «Друго» в Telegram) я отваря с избрано «Друго».
 */
// Правият Cormorant: основните форми и равните цифри (БГ формите остават само в курсива).
const UPRIGHT = "[font-feature-settings:'locl'_0,'lnum'_1]";

export function AdminCampaignCard({
  v,
  name,
  dates,
  checkLine,
  openReturn,
}: {
  v: CampaignView;
  name: string;
  dates: string;
  checkLine: string;
  openReturn?: boolean;
}) {
  const router = useRouter();
  const [reason, setReason] = React.useState<ReturnReasonKey | null>(openReturn ? "other" : null);
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState<"ok" | "back" | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const ref = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    if (openReturn) ref.current?.scrollIntoView({ block: "center" });
  }, [openReturn]);

  async function approve() {
    if (busy) return;
    setBusy("ok");
    setError(null);
    try {
      const r = await approveCampaign(v.id);
      if (!r.ok) return setError(r.error);
      toast.success(r.startsLine);
      router.refresh();
    } catch (e) {
      console.error("[campaigns] одобрението падна:", e);
      setError("Няма връзка. Промоцията не е одобрена. Опитай пак.");
    } finally {
      setBusy(null);
    }
  }

  async function sendBack() {
    if (busy) return;
    if (!reason) return setError("Избери причина.");
    setBusy("back");
    setError(null);
    try {
      const r = await returnCampaign(v.id, reason, note.trim() || null);
      if (!r.ok) return setError(r.error);
      const because = RETURN_REASONS.find((x) => x.key === reason)!.because;
      toast.success(reason === "other" ? "Върната." : `Върната заради ${because}.`);
      router.refresh();
    } catch (e) {
      console.error("[campaigns] връщането падна:", e);
      setError("Няма връзка. Промоцията не е върната. Опитай пак.");
    } finally {
      setBusy(null);
    }
  }

  const btn = "inline-flex h-14 items-center justify-center gap-2 rounded-full border px-10 text-lg font-medium transition-colors";
  return (
    <article ref={ref} className="overflow-hidden rounded-2xl border border-border bg-background lg:max-w-[72rem]">
      <header className="border-b border-border bg-secondary/70 px-5 py-3 text-[17px] text-muted-foreground lg:px-8 lg:py-4 lg:text-xl lg:font-medium lg:text-foreground">
        {name}
      </header>
      <div className="px-5 pb-6 pt-4 lg:px-8 lg:pt-5">
        <p className="font-serif text-[26px] italic leading-tight text-primary lg:text-[2.5rem]">{v.who}</p>
        <div className="mt-2 divide-y divide-border/70 lg:max-w-[50rem]">
          {v.services.map((s) => (
            <div key={s.serviceItemId} className={cn("py-2", v.kind === "discount" ? "lg:flex lg:items-baseline lg:gap-5" : "flex items-baseline gap-3 lg:gap-5")}>
              <p className={cn("text-[21px] leading-snug lg:shrink-0 lg:font-serif-semi lg:text-[2.25rem] lg:font-semibold", UPRIGHT)}>{s.name}</p>
              <span className={cn("mb-2 min-w-8 flex-1 self-end border-b-2 border-dotted border-muted-foreground/50 lg:mb-3", v.kind === "discount" && "hidden lg:block")} aria-hidden />
              {v.kind === "discount" && s.prevEur != null && s.newEur != null ? (
                <div className="mt-1 flex items-baseline gap-4 lg:mt-0 lg:grid lg:grid-cols-[auto_auto] lg:gap-x-8 lg:gap-y-1">
                  <s className={cn("font-serif text-[30px] leading-none text-muted-foreground lg:text-[2.5rem]", UPRIGHT)}>{formatEuro(s.prevEur)}</s>
                  <span className={cn("font-serif text-[48px] italic leading-none text-primary lg:font-serif-semi lg:text-[5rem] lg:font-semibold lg:not-italic", UPRIGHT)}>{formatEuro(s.newEur)}</span>
                  {s.percent != null && (
                    <span className={cn("ml-auto font-serif text-[30px] italic leading-none text-primary lg:col-start-2 lg:ml-0 lg:text-right lg:font-serif-semi lg:text-[3rem] lg:font-semibold lg:not-italic", UPRIGHT)}>−{s.percent}%</span>
                  )}
                  <span className="sr-only">
                    Предишна цена {formatEuro(s.prevEur)}, нова цена {formatEuro(s.newEur)}.
                  </span>
                </div>
              ) : (
                <p className={cn("shrink-0 font-serif text-[24px] leading-none lg:text-[2.25rem]", UPRIGHT)}>
                  {s.regularEur != null ? `${s.priceFrom ? "от " : ""}${formatEuro(s.regularEur)}` : ""}
                </p>
              )}
            </div>
          ))}
        </div>
        {v.kind === "gift" && v.gift && (
          <p className="mt-1 font-serif text-[22px] italic text-primary lg:text-[1.75rem]">Подарък в същия час: {v.gift}</p>
        )}
        <p className="mt-3 border-t border-border pt-3 text-[19px] lg:border-0 lg:pt-0 lg:text-[1.3rem]">{dates}</p>
        {v.reason && <p className="mt-3 font-serif text-[21px] italic text-muted-foreground lg:text-[1.75rem]">Защо: {v.reason}</p>}
        <p className="mt-4 flex items-start gap-3 border-t border-border pt-4 text-[17px] text-primary lg:border-0 lg:pt-0 lg:text-xl lg:text-foreground">
          <Check className="mt-0.5 size-6 shrink-0 rounded-full bg-primary p-1 text-primary-foreground lg:bg-transparent lg:p-0 lg:text-primary" strokeWidth={3} aria-hidden />
          {checkLine}
        </p>

        <div className="mt-6 flex flex-col gap-3 border-t border-border pt-6 lg:flex-row lg:flex-wrap lg:items-center lg:gap-6">
          <button
            type="button"
            onClick={approve}
            disabled={!!busy}
            className={cn(btn, reason ? "border-foreground bg-background text-foreground" : "border-foreground bg-foreground text-background")}
          >
            {busy === "ok" && <Loader2 className="size-5 animate-spin" aria-hidden />}
            Одобри
          </button>
          <button
            type="button"
            onClick={sendBack}
            disabled={!!busy}
            className={cn(btn, reason ? "border-foreground bg-foreground text-background" : "border-border bg-background text-foreground hover:border-foreground/40")}
          >
            {busy === "back" && <Loader2 className="size-5 animate-spin" aria-hidden />}
            Върни
          </button>
          <div className="grid w-full grid-cols-4 gap-1.5 max-[369px]:grid-cols-2 lg:ml-6 lg:flex lg:w-auto lg:flex-wrap lg:gap-2" role="radiogroup" aria-label="Причина за връщане">
            {RETURN_REASONS.map((r) => (
              <button
                key={r.key}
                type="button"
                role="radio"
                aria-checked={reason === r.key}
                onClick={() => {
                  setReason(reason === r.key ? null : r.key);
                  setError(null);
                }}
                className={cn(
                  "inline-flex h-12 items-center justify-center rounded-full border px-1 text-[16px] transition-colors lg:min-w-[5.5rem] lg:px-5 lg:text-[17px]",
                  reason === r.key ? "border-foreground bg-foreground text-background" : "border-border bg-background hover:border-foreground/40",
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        {reason && (
          <input
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))}
            maxLength={NOTE_MAX}
            placeholder={reason === "other" ? `Ред до ${name}` : `Ред до ${name}, по желание`}
            aria-label={`Ред до ${name}`}
            className="mt-4 h-12 w-full rounded-xl border border-input bg-background px-4 text-base lg:max-w-[40rem]"
            autoFocus={openReturn}
          />
        )}
        {error && (
          <p role="alert" className="mt-3 text-[15px] text-destructive">
            {error}
          </p>
        )}
      </div>
    </article>
  );
}
