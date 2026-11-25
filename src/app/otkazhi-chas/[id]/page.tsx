import type { Metadata } from "next";
import Link from "next/link";
import { Phone } from "lucide-react";
import { db } from "@/lib/db";
import { formatWhen } from "@/lib/email/booking";
import { isLateCancel } from "@/lib/booking/status";
import { siteConfig } from "@/lib/site";
import { CancelBookingPanel } from "@/components/forms/cancel-booking-panel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Отказ на час",
  robots: { index: false, follow: false },
};

// Неразделими интервали: номерът не се разделя на два реда на телефон.
const PHONE = siteConfig.contact.phoneFormatted.replaceAll(" ", "\u00a0");

export default async function CancelBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const booking = await db.query.bookings.findFirst({ where: (b, { eq }) => eq(b.id, id) });
  const resource = booking
    ? await db.query.resources.findFirst({ where: (r, { eq }) => eq(r.id, booking.resourceId), columns: { name: true } })
    : null;

  const past = booking ? booking.startAt.getTime() < Date.now() : false;
  const cancelled = booking?.status === "cancelled";
  const canCancel = !!booking && !past && !cancelled;
  // Заглавието описва състоянието (канон «Error Utility Pages», правило 14).
  const title = !booking
    ? "Не намираме този час"
    : cancelled
      ? "Този час вече е отказан"
      : past
        ? "Този час вече е минал"
        : "Отказ на час";

  return (
    <section className="bg-cream pt-32 pb-20 lg:pt-40">
      <div className="mx-auto max-w-md px-4">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.25em] text-foreground/60">Euphoria</p>
        <h1 className="font-display text-3xl font-medium md:text-4xl">{title}</h1>

        {booking ? (
          <div className="mt-6 rounded-2xl border border-border bg-background p-5">
            <dl className="space-y-2 text-sm">
              <Row k="Услуга" v={booking.serviceName} />
              <Row k="Изпълнител" v={resource?.name ?? "екипа на Euphoria"} />
              <Row k="Кога" v={formatWhen(booking.startAt)} />
            </dl>
            <div className="mt-5">
              {canCancel ? (
                <CancelBookingPanel id={id} late={isLateCancel(booking.startAt)} />
              ) : cancelled ? (
                <p className="text-sm text-muted-foreground">Не е нужно да правиш нищо повече.</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Оттук не може да се откаже. За въпроси:{" "}
                  <a href={`tel:${siteConfig.contact.phone}`} className="font-medium text-foreground underline underline-offset-2">
                    {PHONE}
                  </a>
                  .
                </p>
              )}
            </div>
            {!canCancel && (
              <Link href="/zapazi-chas" className="mt-4 inline-block text-sm font-medium underline underline-offset-2">
                Запази нов час
              </Link>
            )}
          </div>
        ) : (
          <div className="mt-6">
            <p className="text-muted-foreground">
              Линкът може да е непълен или остарял. Отвори го пак от писмото или се обади на {PHONE}.
            </p>
            <a
              href={`tel:${siteConfig.contact.phone}`}
              className="mt-5 inline-flex h-12 items-center gap-2 rounded-full bg-foreground px-6 text-base font-medium text-background hover:bg-primary"
            >
              <Phone className="size-4" /> Обади се на {PHONE}
            </a>
          </div>
        )}
      </div>
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="shrink-0 text-muted-foreground">{k}</dt>
      <dd className="text-right font-medium">{v}</dd>
    </div>
  );
}
