"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cancelOwnBooking } from "@/lib/actions/cancel-booking";
import { siteConfig } from "@/lib/site";

// Неразделими интервали: номерът не се разделя на два реда на телефон.
const PHONE = siteConfig.contact.phoneFormatted.replaceAll(" ", "\u00a0");

/** Редът за 50% при късен отказ (Саиф, №17): казва се преди потвърждението и след него. */
const LATE_BEFORE = `До часа остават по-малко от 5 часа, затова това е късен отказ. Може да начислим 50% от стойността на услугата при следващото ти посещение. Можеш и да се обадиш на ${PHONE}.`;
const LATE_AFTER = `Отбелязахме го като късен отказ: може да начислим 50% от стойността на услугата при следващото ти посещение. Въпроси? Обади се на ${PHONE}.`;

export function CancelBookingPanel({ id, late }: { id: string; late: boolean }) {
  const [done, setDone] = React.useState<{ late: boolean } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState(false);

  if (done) {
    return (
      <div role="status" className="rounded-xl bg-mint/30 px-4 py-4 text-sm text-foreground">
        <p className="flex items-center gap-2 text-base font-medium">
          <CheckCircle2 className="size-5 text-primary" /> Часът е отказан.
        </p>
        <p className="mt-2">{done.late ? LATE_AFTER : "Благодарим, че ни каза навреме."}</p>
        <Link href="/zapazi-chas" className="mt-3 inline-block font-medium underline underline-offset-2">
          Запази нов час
        </Link>
      </div>
    );
  }

  async function confirm() {
    setBusy(true);
    setErr(false);
    try {
      const res = await cancelOwnBooking(id);
      if (res.ok) setDone({ late: res.late });
      else setErr(true);
    } catch {
      setErr(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="mb-3 text-sm text-foreground/80">
        {late ? LATE_BEFORE : "Отказваш в срок: до часа има повече от 5 часа."}
      </p>
      <Button
        onClick={confirm}
        disabled={busy}
        className="h-12 w-full rounded-full bg-destructive text-base text-white hover:bg-destructive/90"
      >
        {busy ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Отказвам…
          </>
        ) : late ? (
          "Потвърди късния отказ"
        ) : (
          "Потвърди отказа"
        )}
      </Button>
      <p className="mt-3 text-center text-xs text-muted-foreground">Размисли ли си? Затвори страницата, часът остава.</p>
      {err && (
        <div role="alert" className="mt-3 text-sm text-destructive">
          <p>Не успяхме да откажем часа. Опитай пак или се обади на {PHONE}.</p>
          <a
            href={`tel:${siteConfig.contact.phone}`}
            className="mt-2 inline-flex items-center gap-1.5 font-medium text-foreground underline underline-offset-2"
          >
            <Phone className="size-4" /> {PHONE}
          </a>
        </div>
      )}
    </div>
  );
}
