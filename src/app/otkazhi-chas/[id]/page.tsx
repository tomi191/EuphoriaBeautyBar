import type { Metadata } from "next";
import { db } from "@/lib/db";
import { formatWhen } from "@/lib/email/booking";
import { CancelBookingPanel } from "@/components/forms/cancel-booking-panel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Отмяна на час",
  robots: { index: false, follow: false },
};

export default async function CancelBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const booking = await db.query.bookings.findFirst({ where: (b, { eq }) => eq(b.id, id) });
  const resource = booking
    ? await db.query.resources.findFirst({ where: (r, { eq }) => eq(r.id, booking.resourceId), columns: { name: true } })
    : null;

  const past = booking ? booking.startAt.getTime() < Date.now() : false;
  const cancelled = booking?.status === "cancelled";
  const canCancel = !!booking && !past && !cancelled;
  const note = !booking
    ? "Този час не е намерен. Възможно е линкът да е невалиден или остарял."
    : cancelled
      ? "Този час вече е отменен."
      : past
        ? "Този час вече е минал и не може да се отмени онлайн."
        : undefined;

  return (
    <section className="bg-cream pt-32 pb-20 lg:pt-40">
      <div className="mx-auto max-w-md px-4">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.25em] text-foreground/60">Euphoria</p>
        <h1 className="font-display text-3xl font-medium md:text-4xl">Отмяна на час</h1>

        {booking ? (
          <div className="mt-6 rounded-2xl border border-border bg-background p-5">
            <dl className="space-y-2 text-sm">
              <Row k="Услуга" v={booking.serviceName} />
              <Row k="Изпълнител" v={resource?.name ?? "екипа на Euphoria"} />
              <Row k="Кога" v={formatWhen(booking.startAt)} />
            </dl>
            <div className="mt-5">
              <CancelBookingPanel id={id} canCancel={canCancel} note={note} />
            </div>
            {canCancel && (
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Размислил си? Просто затвори страницата — часът остава.
              </p>
            )}
          </div>
        ) : (
          <p className="mt-6 text-muted-foreground">{note}</p>
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
