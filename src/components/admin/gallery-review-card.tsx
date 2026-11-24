"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { EyeOff, Loader2, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { approveGalleryImage, rejectGalleryImage, removeGalleryImageFromSite, saveGalleryAlt } from "@/lib/actions/gallery-review";
import { deleteGalleryImage } from "@/lib/actions/gallery";
import { ALT_MAX } from "@/lib/gallery/alt";
import { REJECT_REASON_MAX } from "@/lib/gallery/upload-rules";
import { REJECT_REASONS, REVIEW_TEXT, reviewDay, uploadedWhen } from "@/lib/gallery/review-text";
import type { ReviewCard } from "@/lib/gallery/review";
import { cn } from "@/lib/utils";

// Бутоните: 48 px на телефон, 36 px и радиус 6 px на компютър (размерите на администрацията).
const btn =
  "inline-flex h-12 items-center justify-center gap-2 rounded-md px-4 text-[15px] font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 lg:h-10 lg:text-sm";
const black = cn(btn, "bg-foreground text-background hover:bg-foreground/90");
const outline = cn(btn, "border border-foreground/25 bg-background text-foreground hover:border-foreground/50");
const field =
  "w-full rounded-md border border-input bg-background px-3 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-destructive lg:text-sm";

/**
 * Карта на снимка от специалист при Снежана (№8 В3, кадри «В-админ-1440» и «В-одобрение-390»).
 * Чакаща: «Одобри» / «Върни» (панел с готовите причини). Одобрена: «Махни от сайта». Върната:
 * причината и «Изтрий завинаги». Описанието се поправя с молива във всички.
 */
export function GalleryReviewCard({ card, initial }: { card: ReviewCard; initial?: "edit" | "reject" }) {
  const router = useRouter();
  const [mode, setMode] = React.useState<"view" | "edit" | "reject">(initial ?? "view");
  const [alt, setAlt] = React.useState(card.alt);
  const [draft, setDraft] = React.useState(card.alt);
  const [altErr, setAltErr] = React.useState<string | null>(null);
  const [reason, setReason] = React.useState("");
  const [reasonErr, setReasonErr] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<null | "approve" | "reject" | "alt" | "remove" | "delete">(null);
  const [confirm, setConfirm] = React.useState<null | "remove" | "delete">(null);
  const rootRef = React.useRef<HTMLElement>(null);
  const altRef = React.useRef<HTMLTextAreaElement>(null);
  const reasonRef = React.useRef<HTMLTextAreaElement>(null);
  const ids = React.useId();

  // Отворена от бутон в Telegram (?edit= / ?reject=): картата идва на екрана с полето в фокус.
  React.useEffect(() => {
    if (!initial) return;
    rootRef.current?.scrollIntoView({ block: "center" });
    (initial === "edit" ? altRef : reasonRef).current?.focus();
  }, [initial]);

  const pending = card.status === "pending";
  const when = card.createdAt ? uploadedWhen(new Date(card.createdAt)) : null;
  const line2 =
    card.status === "approved"
      ? `Качена от ${card.uploader}${card.approvedAt ? ` · одобрена на ${reviewDay(new Date(card.approvedAt))}` : ""}`
      : card.status === "rejected"
        ? `Върната${card.rejectedAt ? ` на ${reviewDay(new Date(card.rejectedAt))}` : ""}${card.rejectReason ? ` · ${card.rejectReason}` : ""}`
        : `Качена от ${card.uploader}${when ? ` · ${when}` : ""}`;

  async function approve() {
    setBusy("approve");
    try {
      const r = await approveGalleryImage(card.id, {});
      if (!r.ok) return void toast.error(r.error);
      toast.success(REVIEW_TEXT.approved);
      router.refresh();
    } catch {
      toast.error("Снимката не излезе. Опитай пак след малко.");
    } finally {
      setBusy(null);
    }
  }

  async function reject(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      setReasonErr("Напиши причина или избери готова.");
      reasonRef.current?.focus();
      return;
    }
    setBusy("reject");
    try {
      const r = await rejectGalleryImage(card.id, reason);
      if (!r.ok) {
        setReasonErr(r.error);
        return;
      }
      toast.success(REVIEW_TEXT.rejected);
      router.refresh();
    } catch {
      setReasonErr("Не е върната. Опитай пак след малко.");
    } finally {
      setBusy(null);
    }
  }

  async function saveAlt(e: React.FormEvent) {
    e.preventDefault();
    setBusy("alt");
    setAltErr(null);
    try {
      const r = await saveGalleryAlt(card.id, draft);
      if (!r.ok) {
        if (r.error === REVIEW_TEXT.altEmpty) setDraft(alt);
        setAltErr(r.error);
        return;
      }
      if (!draft.trim()) {
        setAlt(r.alt);
        setDraft(r.alt);
        toast(REVIEW_TEXT.altEmpty);
      } else {
        setAlt(r.alt);
        toast.success(REVIEW_TEXT.altSaved);
      }
      setMode("view");
      router.refresh();
    } catch {
      setAltErr("Описанието не е запазено. Опитай пак след малко.");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    setBusy("remove");
    try {
      const r = await removeGalleryImageFromSite(card.id);
      if (!r.ok) return void toast.error(r.error);
      setConfirm(null);
      toast.success("Махната от сайта.");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function destroy() {
    setBusy("delete");
    try {
      const r = await deleteGalleryImage(card.id);
      if (!r.ok) return void toast.error(r.error);
      setConfirm(null);
      toast.success("Снимката е изтрита.");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  const reasonLen = [...reason].length;

  return (
    <article ref={rootRef} className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="aspect-[2/1] bg-secondary lg:aspect-[11/16]">
        {card.previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.previewUrl} alt={alt} className="size-full object-cover" />
        )}
      </div>

      <div className="p-4 lg:p-3.5">
        {mode === "edit" ? (
          <form onSubmit={saveAlt} noValidate>
            <label htmlFor={`${ids}-alt`} className="mb-1.5 block text-sm font-medium">
              Описание
            </label>
            <textarea
              id={`${ids}-alt`}
              ref={altRef}
              rows={3}
              maxLength={ALT_MAX}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              aria-invalid={!!altErr}
              aria-describedby={altErr ? `${ids}-alt-err` : undefined}
              className={cn(field, "resize-none")}
            />
            {altErr && (
              <p id={`${ids}-alt-err`} role="alert" className="mt-1.5 text-sm text-destructive">
                {altErr}
              </p>
            )}
            <div className="mt-2.5 grid grid-cols-2 gap-2.5">
              <button type="submit" disabled={busy === "alt"} className={black}>
                {busy === "alt" && <Loader2 className="size-4 animate-spin" aria-hidden />}
                Запази
              </button>
              <button
                type="button"
                className={outline}
                onClick={() => {
                  setDraft(alt);
                  setAltErr(null);
                  setMode("view");
                }}
              >
                Отказ
              </button>
            </div>
          </form>
        ) : (
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-sans text-[17px] font-semibold leading-snug">{alt}</h3>
            <button
              type="button"
              aria-label="Поправи описанието"
              title="Поправи описанието"
              onClick={() => {
                setDraft(alt);
                setMode("edit");
                requestAnimationFrame(() => altRef.current?.focus());
              }}
              className="-mr-2 -mt-2.5 grid size-11 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <Pencil className="size-4" strokeWidth={1.7} aria-hidden />
            </button>
          </div>
        )}

        {mode !== "edit" && pending && !card.hasNote && !card.altSaved && (
          <p className="mt-0.5 text-sm text-muted-foreground">{REVIEW_TEXT.noNote}</p>
        )}
        <p className="mt-1 text-[15px] text-muted-foreground lg:text-[13px]">{line2}</p>
        {card.noFace && card.status !== "rejected" && (
          <p className="mt-2 flex items-center gap-2 text-[15px] text-muted-foreground lg:mt-2.5 lg:text-[13px]">
            <EyeOff className="size-[18px] shrink-0" strokeWidth={1.6} aria-hidden />
            {REVIEW_TEXT.noFace}
          </p>
        )}

        {pending && mode === "view" && (
          <div className="mt-3.5 grid grid-cols-2 gap-2.5 lg:mt-3 lg:gap-3">
            <button type="button" onClick={approve} disabled={!!busy} className={black}>
              {busy === "approve" && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Одобри
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("reject");
                requestAnimationFrame(() => reasonRef.current?.focus());
              }}
              disabled={!!busy}
              className={outline}
            >
              Върни
            </button>
          </div>
        )}

        {pending && mode === "reject" && (
          <form onSubmit={reject} noValidate className="mt-3.5 border-t border-border pt-3.5">
            <h4 className="text-base font-semibold">Защо я връщаш?</h4>
            <p className="mt-0.5 text-sm text-muted-foreground">Специалистът ще види причината до снимката.</p>
            <div className="mt-3 flex flex-wrap gap-x-2">
              {REJECT_REASONS.map((r) => (
                <button
                  key={r.label}
                  type="button"
                  onClick={() => {
                    setReason(r.text);
                    setReasonErr(null);
                  }}
                  className="flex h-12 items-center lg:h-10"
                >
                  <span
                    className={cn(
                      "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                      reason === r.text ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground/40",
                    )}
                  >
                    {r.label}
                  </span>
                </button>
              ))}
            </div>
            <label htmlFor={`${ids}-reason`} className="mb-1.5 mt-2 block text-sm font-medium">
              Причина
            </label>
            <textarea
              id={`${ids}-reason`}
              ref={reasonRef}
              rows={3}
              maxLength={REJECT_REASON_MAX}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setReasonErr(null);
              }}
              aria-invalid={!!reasonErr}
              aria-describedby={`${ids}-reason-hint${reasonErr ? ` ${ids}-reason-err` : ""}`}
              className={cn(field, "resize-none")}
            />
            <p id={`${ids}-reason-hint`} className="mt-1 text-[13px] text-muted-foreground">
              {reasonLen >= 60 ? `${reasonLen}/${REJECT_REASON_MAX}` : `До ${REJECT_REASON_MAX} знака`}
            </p>
            {reasonErr && (
              <p id={`${ids}-reason-err`} role="alert" className="mt-1 text-sm text-destructive">
                {reasonErr}
              </p>
            )}
            <div className="mt-3 grid grid-cols-[1fr_auto] gap-2.5">
              <button type="submit" disabled={busy === "reject"} className={cn(black, "whitespace-nowrap")}>
                {busy === "reject" && <Loader2 className="size-4 animate-spin" aria-hidden />}
                Върни снимката
              </button>
              <button
                type="button"
                className={outline}
                onClick={() => {
                  setMode("view");
                  setReasonErr(null);
                }}
              >
                Отказ
              </button>
            </div>
          </form>
        )}

        {card.status === "approved" && mode !== "edit" && (
          <button type="button" onClick={() => setConfirm("remove")} className={cn(outline, "mt-3.5 w-full lg:mt-3")}>
            Махни от сайта
          </button>
        )}
        {card.status === "rejected" && mode !== "edit" && (
          <button
            type="button"
            onClick={() => setConfirm("delete")}
            className="-ml-1 mt-1.5 inline-flex h-12 items-center px-1 text-sm text-destructive underline underline-offset-4 lg:h-9"
          >
            Изтрий завинаги
          </button>
        )}
      </div>

      <Dialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent showCloseButton={false} className="max-w-[calc(100%-2rem)] sm:max-w-md">
          {confirm === "remove" ? (
            <>
              <DialogTitle className="text-lg">Да махна ли снимката от сайта?</DialogTitle>
              <DialogDescription>Излиза от галерията веднага. Специалистът ще види, че е махната.</DialogDescription>
              <DialogFooter className="flex-col gap-2 sm:flex-col">
                <div className="grid grid-cols-2 gap-2.5">
                  <button type="button" onClick={remove} disabled={!!busy} className={black}>
                    {busy === "remove" && <Loader2 className="size-4 animate-spin" aria-hidden />}
                    Махни
                  </button>
                  <button type="button" onClick={() => setConfirm(null)} className={outline}>
                    Остави
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirm("delete")}
                  className="inline-flex h-12 items-center justify-center text-sm text-destructive underline underline-offset-4 lg:h-9"
                >
                  Изтрий завинаги
                </button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogTitle className="text-lg">Да изтрия ли снимката завинаги?</DialogTitle>
              <DialogDescription>Махат се и оригиналът, и снимката със знак. Не може да се върне.</DialogDescription>
              <DialogFooter className="grid grid-cols-2 gap-2.5 sm:grid">
                <button
                  type="button"
                  onClick={destroy}
                  disabled={!!busy}
                  className={cn(btn, "bg-destructive text-white hover:bg-destructive/90")}
                >
                  {busy === "delete" && <Loader2 className="size-4 animate-spin" aria-hidden />}
                  Изтрий
                </button>
                <button type="button" onClick={() => setConfirm(null)} className={outline}>
                  Остави
                </button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </article>
  );
}
