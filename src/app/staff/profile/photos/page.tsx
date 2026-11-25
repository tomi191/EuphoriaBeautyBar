import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { and, asc, eq } from "drizzle-orm";
import { requireStaff } from "@/lib/actions/auth-guard";
import { listMyGalleryImages } from "@/lib/actions/staff-gallery";
import { db, schema } from "@/lib/db";
import { StaffShell } from "@/components/staff/staff-shell";
import { loadStaffDots } from "@/lib/admin/popalni";
import { WorkPhotoSheet } from "@/components/staff/work-photo-sheet";
import { MyPhotosGrid, StatusPill, type GridPhoto } from "@/components/staff/my-photos-grid";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Моите снимки | Euphoria",
  robots: { index: false, follow: false },
};

/**
 * «Моите снимки» и екранът «Изпратена е» (№8 В2, кадър «В-приложение-390» екрани 3 и 4).
 * С `?sent=<id>` показва потвърждението за току-що изпратената снимка.
 */
export default async function StaffPhotosPage({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const { resource } = await requireStaff();
  const { sent } = await searchParams;

  const [images, services] = await Promise.all([
    listMyGalleryImages(),
    db
      .select({ id: schema.serviceItems.id, name: schema.serviceItems.name })
      .from(schema.resourceServices)
      .innerJoin(schema.serviceItems, eq(schema.serviceItems.id, schema.resourceServices.serviceItemId))
      .where(and(eq(schema.resourceServices.resourceId, resource.id), eq(schema.resourceServices.active, true)))
      .orderBy(asc(schema.serviceItems.sortOrder)),
  ]);

  const justSent = sent ? images.find((i) => i.id === sent) : undefined;
  if (justSent) {
    return (
      <StaffShell dots={await loadStaffDots(resource.id)} kind={resource.kind}>
        <div className="flex flex-col items-center pt-7 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-primary text-primary-foreground" aria-hidden>
            <Check className="size-7" strokeWidth={2.6} />
          </span>
          <div className="relative mt-6 w-48">
            <div className="aspect-square overflow-hidden rounded-2xl bg-secondary">
              {justSent.previewUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={justSent.previewUrl}
                  alt={`${[justSent.serviceName, justSent.note].filter(Boolean).join(": ")}, чака одобрение`}
                  className="size-full object-cover"
                />
              )}
            </div>
            <StatusPill status="pending" className="absolute -bottom-3.5 left-1/2 h-8 -translate-x-1/2 bg-secondary px-6 text-base" />
          </div>
          <h1 className="mt-12 font-display text-[26px] font-medium leading-[1.2]" aria-live="polite">
            Изпратена е.{" "}
            <br />
            Снежана ще я види.
          </h1>
          <Link
            href="/staff"
            className="mt-9 inline-flex h-12 w-full items-center justify-center rounded-full bg-primary text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Към графика
          </Link>
          <Link
            href="/staff/profile/photos"
            className="mt-1 inline-flex h-12 items-center px-3 text-base font-medium text-primary underline decoration-primary/60 underline-offset-4"
          >
            Моите снимки
          </Link>
        </div>
      </StaffShell>
    );
  }

  const photos: GridPhoto[] = images.map((i) => ({
    id: i.id,
    status: i.status,
    rejectReason: i.rejectReason,
    serviceName: i.serviceName,
    note: i.note,
    alt: i.alt,
    previewUrl: i.previewUrl,
    rejectedAtISO: i.rejectedAt ? i.rejectedAt.toISOString() : null,
  }));

  return (
    <StaffShell dots={await loadStaffDots(resource.id)} kind={resource.kind} wide>
      <Link
        href="/staff/profile"
        className="-ml-1 -mt-3 inline-flex h-12 items-center gap-6 px-1 text-[17px] text-foreground transition-colors hover:text-foreground/70"
      >
        <ArrowLeft className="size-5" strokeWidth={1.7} aria-hidden />
        Профил
      </Link>
      <h1 className="mb-4 font-display text-[28px] font-medium leading-tight">Моите снимки</h1>

      <WorkPhotoSheet
        services={services}
        label="Добави снимка от работата"
        className="mb-5 inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-3xl border border-border bg-background text-sm font-medium text-foreground transition-colors hover:border-foreground/40"
      />

      {photos.length === 0 ? (
        <div className="rounded-2xl border border-border bg-background p-6 text-center">
          <p className="text-[15px] leading-relaxed text-muted-foreground">
            Още няма снимки. Когато завършиш час, натисни „Добави снимка от работата“ в графика.
          </p>
          <Link
            href="/staff"
            className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-full bg-primary text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Към графика
          </Link>
        </div>
      ) : (
        <MyPhotosGrid photos={photos} />
      )}
    </StaffShell>
  );
}
