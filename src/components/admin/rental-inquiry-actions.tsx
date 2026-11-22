"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Phone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteInquiry, markInquiryHandled } from "@/lib/actions/rental-inquiries";

/*
 * Действията за едно запитване (визия №19): бутон с телефона (звъни), «Обадих се» (мести в
 * обработени), «Изтрий» с потвърждение на място, без прозорец отгоре. Сървърът проверява администратор.
 */

interface Props {
  inquiry: { id: string; status: "new" | "handled"; phone: string; phoneLabel: string; name: string };
  /** card: картата на телефон; phone: колоната «Телефон»; table: колоната «Действия». */
  layout: "card" | "phone" | "table";
  className?: string;
}

const btn =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 text-base font-medium hover:bg-muted disabled:opacity-60";
const btnTable =
  "inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 text-[0.9375rem] font-medium hover:bg-muted disabled:opacity-60";

export function InquiryActions({ inquiry, layout, className = "" }: Props) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<null | "handled" | "delete">(null);
  const [confirming, setConfirming] = React.useState(false);

  if (layout === "phone") {
    return (
      <a href={`tel:${inquiry.phone}`} className="inline-flex min-h-12 items-center gap-2 text-[1.0625rem]" aria-label={`Обади се на ${inquiry.name}: ${inquiry.phoneLabel}`}>
        <Phone className="size-5 shrink-0" strokeWidth={1.6} aria-hidden />
        <span className="whitespace-nowrap underline decoration-primary/60 decoration-2 underline-offset-[6px]">{inquiry.phoneLabel}</span>
      </a>
    );
  }

  async function handled() {
    setBusy("handled");
    try {
      const res = await markInquiryHandled(inquiry.id);
      if (!res.ok) return void toast.error(res.error);
      toast.success(`${inquiry.name} е в обработени.`);
      router.refresh();
    } catch {
      toast.error("Не успях. Опитай пак.");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    setBusy("delete");
    try {
      const res = await deleteInquiry(inquiry.id);
      if (!res.ok) return void toast.error(res.error);
      toast.success("Запитването е изтрито.");
      setConfirming(false);
      router.refresh();
    } catch {
      toast.error("Не успях. Опитай пак.");
    } finally {
      setBusy(null);
    }
  }

  const b = layout === "card" ? btn : btnTable;

  if (confirming) {
    return (
      <div className={"rounded-xl border border-border bg-secondary/60 p-3 " + className} role="group" aria-label="Потвърждение">
        <p className="text-base font-medium">Да изтрия ли запитването на {inquiry.name}?</p>
        <p className="mt-1 text-[0.9375rem] text-muted-foreground">Името и телефонът се махат завинаги.</p>
        <div className={"mt-3 grid gap-2 " + (layout === "card" ? "grid-cols-2" : "grid-cols-1")}>
          <button
            type="button"
            onClick={remove}
            disabled={busy !== null}
            className={b + " border-foreground bg-foreground text-background hover:bg-foreground/90"}
            autoFocus
          >
            {busy === "delete" && <Loader2 className="size-4 animate-spin" aria-hidden />}
            Изтрий
          </button>
          <button type="button" onClick={() => setConfirming(false)} disabled={busy !== null} className={b}>
            Отказ
          </button>
        </div>
      </div>
    );
  }

  const handledBtn =
    inquiry.status === "new" ? (
      <button type="button" onClick={handled} disabled={busy !== null} className={b}>
        {busy === "handled" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Check className="size-5" strokeWidth={1.8} aria-hidden />}
        Обадих се
      </button>
    ) : null;
  const deleteBtn = (
    <button type="button" onClick={() => setConfirming(true)} disabled={busy !== null} className={b}>
      <Trash2 className="size-5" strokeWidth={1.6} aria-hidden /> Изтрий
    </button>
  );

  if (layout === "table") {
    return (
      <div className={"flex flex-col gap-2 " + className}>
        {handledBtn}
        {deleteBtn}
      </div>
    );
  }

  return (
    <div className={"space-y-3 " + className}>
      <a href={`tel:${inquiry.phone}`} className={btn + " text-[1.125rem]"} aria-label={`Обади се на ${inquiry.name}: ${inquiry.phoneLabel}`}>
        <Phone className="size-5" strokeWidth={1.6} aria-hidden /> {inquiry.phoneLabel}
      </a>
      {handledBtn ? (
        <div className="grid grid-cols-2 gap-3">
          {handledBtn}
          {deleteBtn}
        </div>
      ) : (
        deleteBtn
      )}
    </div>
  );
}
