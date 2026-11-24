"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import { Loader2, Trash2, X } from "lucide-react";
import { deleteMyGalleryImage, type MyGalleryImage } from "@/lib/actions/staff-gallery";
import { cn } from "@/lib/utils";

const TZ = "Europe/Sofia";
const dayMonth = new Intl.DateTimeFormat("bg-BG", { timeZone: TZ, day: "numeric", month: "long" });
const dayMonthYear = new Intl.DateTimeFormat("bg-BG", { timeZone: TZ, day: "numeric", month: "long", year: "numeric" });
const yearOf = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric" });

/** «21 ноември»; с годината само ако не е текущата. Intl добавя « г.», махаме го. */
export function shortDate(d: Date): string {
  const sameYear = yearOf.format(d) === yearOf.format(new Date());
  return (sameYear ? dayMonth : dayMonthYear).format(d).replace(/\s*г\.$/, "");
}

export type GridPhoto = Pick<MyGalleryImage, "id" | "status" | "rejectReason" | "serviceName" | "note" | "alt" | "previewUrl"> & {
  rejectedAtISO: string | null;
};

const PILL: Record<GridPhoto["status"], { label: string; sr: string; cls: string }> = {
  pending: { label: "Чака", sr: "чака одобрение", cls: "bg-background/90 text-foreground" },
  approved: { label: "В галерията", sr: "в галерията", cls: "bg-mint-soft text-primary" },
  rejected: { label: "Върната", sr: "върната", cls: "bg-destructive text-white" },
};

/** Описанието на картинката: сглобеното (одобрена) или услугата и думите, плюс състоянието (доклад на Саиф, 4.4). */
function photoAlt(p: GridPhoto): string {
  const base = p.alt || [p.serviceName, p.note].filter(Boolean).join(": ") || "Снимка от работата";
  return `${base}, ${PILL[p.status].sr}`;
}

export function StatusPill({ status, className }: { status: GridPhoto["status"]; className?: string }) {
  const pill = PILL[status];
  return (
    <span className={cn("inline-flex h-7 items-center whitespace-nowrap rounded-full px-3.5 text-sm font-semibold", pill.cls, className)} aria-hidden>
      {pill.label}
    </span>
  );
}

/** «Моите снимки» (№8 В2, кадър «В-приложение-390» екран 4): решетката, отварянето и изтриването. */
export function MyPhotosGrid({ photos }: { photos: GridPhoto[] }) {
  const router = useRouter();
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [confirming, setConfirming] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const current = photos.find((p) => p.id === openId) ?? null;

  function close() {
    if (deleting) return;
    setOpenId(null);
    setConfirming(false);
    setError(null);
  }

  async function remove() {
    if (!current || deleting) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await deleteMyGalleryImage(current.id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOpenId(null);
      setConfirming(false);
      router.refresh();
    } catch (err) {
      console.error("[my-photos] изтриването падна:", err);
      setError("Няма връзка. Снимката не е изтрита. Опитай пак, щом има интернет.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-3.5 lg:grid-cols-3 lg:gap-x-6 lg:gap-y-5">
        {photos.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => setOpenId(p.id)}
              aria-label={photoAlt(p)}
              className="group relative block aspect-square w-full overflow-hidden rounded-lg bg-secondary outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              {p.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.previewUrl} alt="" className="size-full object-cover" loading="lazy" />
              ) : null}
              <StatusPill status={p.status} className="absolute bottom-1.5 left-1/2 -translate-x-1/2 lg:hidden" />
            </button>
            <div className="hidden justify-center pt-3 lg:flex">
              <StatusPill status={p.status} />
            </div>
            {p.status === "rejected" && (
              <div className="mt-2 text-center text-sm leading-snug text-muted-foreground">
                {p.rejectReason && <p className="line-clamp-3">{p.rejectReason}</p>}
                {p.rejectedAtISO && <p className="mt-0.5 text-xs">Върната на {shortDate(new Date(p.rejectedAtISO))}</p>}
              </div>
            )}
          </li>
        ))}
      </ul>

      <Dialog.Root open={!!current} onOpenChange={(o) => !o && close()}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[calc(100svh-4rem)] overflow-y-auto rounded-t-3xl bg-background px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-3 outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom data-[state=open]:duration-300 lg:inset-auto lg:left-1/2 lg:top-1/2 lg:w-[28rem] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-3xl lg:p-6 lg:[--tw-enter-translate-y:0]"
          >
            {current && (
              <>
                <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-foreground/15 lg:hidden" aria-hidden />
                <div className="flex items-center justify-between gap-3">
                  <Dialog.Title className="font-display text-lg font-medium">{current.serviceName ?? "Снимка от работата"}</Dialog.Title>
                  <Dialog.Close aria-label="Затвори" className="-mr-3 grid size-12 place-items-center rounded-full text-foreground/80 hover:bg-secondary">
                    <X className="size-5" strokeWidth={1.7} />
                  </Dialog.Close>
                </div>
                <div className="relative mt-2 overflow-hidden rounded-xl bg-secondary">
                  {current.previewUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={current.previewUrl} alt={photoAlt(current)} className="max-h-[50svh] w-full object-contain" />
                  )}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <StatusPill status={current.status} />
                  {current.note && <p className="text-sm text-muted-foreground">{current.note}</p>}
                </div>
                {current.status === "rejected" && current.rejectReason && (
                  <div className="mt-3">
                    <p className="text-sm font-semibold">Причина от Снежана</p>
                    <p className="mt-0.5 text-[15px]">{current.rejectReason}</p>
                    {current.rejectedAtISO && (
                      <p className="mt-0.5 text-xs text-muted-foreground">Върната на {shortDate(new Date(current.rejectedAtISO))}</p>
                    )}
                  </div>
                )}

                {current.status !== "approved" && (
                  <div className="mt-5">
                    {error && (
                      <p role="alert" className="mb-2.5 text-sm text-destructive">
                        {error}
                      </p>
                    )}
                    {confirming ? (
                      <div role="group" aria-labelledby="mp-confirm">
                        <p id="mp-confirm" className="mb-2.5 text-[15px] font-semibold">
                          Да изтрия ли снимката?
                        </p>
                        <div className="grid grid-cols-2 gap-2.5">
                          <button
                            type="button"
                            onClick={() => setConfirming(false)}
                            className="h-12 rounded-full border border-border bg-background text-base font-medium hover:border-foreground/40"
                          >
                            Остави
                          </button>
                          <button
                            type="button"
                            onClick={remove}
                            aria-disabled={deleting || undefined}
                            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-destructive text-base font-semibold text-white aria-disabled:opacity-70"
                          >
                            {deleting && <Loader2 className="size-4 animate-spin" aria-hidden />}
                            Изтрий
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirming(true)}
                        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-border bg-background text-base font-medium text-destructive hover:border-destructive/50"
                      >
                        <Trash2 className="size-4" strokeWidth={1.8} aria-hidden />
                        Изтрий снимката
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
