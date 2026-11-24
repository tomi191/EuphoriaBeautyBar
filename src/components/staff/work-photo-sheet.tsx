"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import { Camera, ChevronDown, ImageOff, Loader2, RefreshCw, X } from "lucide-react";
import { prepareFile } from "@/components/admin/gallery-upload-form";
import { uploadStaffGalleryImage } from "@/lib/actions/staff-gallery";
import {
  STAFF_NOTE_MAX,
  STAFF_PHOTO_MAX_BYTES,
  STAFF_PHOTO_MIN_SHORT_SIDE,
  STAFF_UPLOAD_ERRORS as E,
} from "@/lib/gallery/upload-rules";
import { NO_CONNECTION, uploadErrorField, type UploadErrorField } from "@/lib/gallery/upload-error-field";
import { noteHintForService } from "@/lib/gallery/note-hint";
import { cn } from "@/lib/utils";

export type PhotoServiceOpt = { id: string; name: string };

type Picked = { file: File; previewUrl: string } | null;
type Errors = Partial<Record<UploadErrorField, string>>;

/**
 * «Снимка от работата» (№8 В2, кадър «В-приложение-390» екран 2 и «В-приложение-1440» панелът вдясно).
 * Бутонът отваря листа и камерата направо (capture="environment"; на компютър без камера е изборът на файл);
 * после листът показва прегледа, услугата, думите за описанието и потвърждението «без лице».
 * В прегледа: «Снимай пак» и малка връзка «Избери от галерията» (без capture) за снимка, направена по-рано.
 * Снимката се смалява в телефона (prepareFile) и тръгва към uploadStaffGalleryImage; после екранът «Изпратена е».
 * На телефон е лист отдолу, от 1024 px нагоре е панел вдясно.
 */
export function WorkPhotoSheet({
  services,
  booking,
  label,
  className,
}: {
  services: PhotoServiceOpt[];
  /** Часът, от който идва снимката: дава услугата и реда «От часа в …». */
  booking?: { id: string; serviceItemId: string | null; timeLabel: string };
  label: string;
  className?: string;
}) {
  const router = useRouter();
  const cameraRef = React.useRef<HTMLInputElement>(null);
  const galleryRef = React.useRef<HTMLInputElement>(null);
  const noFaceRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const [picked, setPicked] = React.useState<Picked>(null);
  const [preparing, setPreparing] = React.useState(false);
  const fromBooking = booking?.serviceItemId && services.some((s) => s.id === booking.serviceItemId) ? booking.serviceItemId : "";
  const [serviceId, setServiceId] = React.useState(fromBooking || (services.length === 1 ? services[0].id : ""));
  const [note, setNote] = React.useState("");
  const [noFace, setNoFace] = React.useState(false);
  const [errors, setErrors] = React.useState<Errors>({});
  const [retry, setRetry] = React.useState(false);
  const [sending, setSending] = React.useState(false);

  const serviceName = services.find((s) => s.id === serviceId)?.name ?? null;

  function reset() {
    setPicked((p) => {
      if (p) URL.revokeObjectURL(p.previewUrl);
      return null;
    });
    setServiceId(fromBooking || (services.length === 1 ? services[0].id : ""));
    setNote("");
    setNoFace(false);
    setErrors({});
    setRetry(false);
  }

  // На компютър колоната отстъпва вляво, за да не я покрива панелът (StaffShell чете знака).
  React.useEffect(() => {
    if (!open) return;
    document.body.dataset.workPanel = "1";
    return () => {
      delete document.body.dataset.workPanel;
    };
  }, [open]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // същият файл може да се избере пак
    if (!file) return;
    setOpen(true);
    setPreparing(true);
    setErrors((er) => ({ ...er, file: undefined, form: undefined }));
    try {
      let prepared: Awaited<ReturnType<typeof prepareFile>>;
      try {
        prepared = await prepareFile(file);
      } catch {
        setPicked((p) => {
          if (p) URL.revokeObjectURL(p.previewUrl);
          return null;
        });
        setErrors((er) => ({ ...er, file: E.notImage }));
        return;
      }
      let err: string | undefined;
      if (prepared.file.size > STAFF_PHOTO_MAX_BYTES) err = E.tooBig;
      else if (Math.min(prepared.width, prepared.height) < STAFF_PHOTO_MIN_SHORT_SIDE) err = E.tooSmall;
      setPicked((p) => {
        if (p) URL.revokeObjectURL(p.previewUrl);
        return err ? null : { file: prepared.file, previewUrl: prepared.previewUrl };
      });
      if (err) {
        URL.revokeObjectURL(prepared.previewUrl);
        setErrors((er) => ({ ...er, file: err }));
      }
    } finally {
      setPreparing(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (sending) return;
    const next: Errors = {};
    if (!picked) next.file = errors.file ?? E.notImage;
    if (!serviceId) next.service = E.service;
    if (!noFace) next.noFace = E.noFace;
    if (Object.keys(next).length) {
      setErrors(next);
      if (next.noFace && !next.file && !next.service) noFaceRef.current?.focus();
      return;
    }
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setErrors({ form: NO_CONNECTION });
      setRetry(true);
      return;
    }
    const fd = new FormData();
    fd.append("file", picked!.file);
    fd.append("serviceItemId", serviceId);
    fd.append("noFace", "1");
    if (note.trim()) fd.append("note", note.trim());
    if (booking) fd.append("bookingId", booking.id);

    setSending(true);
    setErrors({});
    let res: Awaited<ReturnType<typeof uploadStaffGalleryImage>>;
    try {
      res = await uploadStaffGalleryImage(fd);
    } catch (err) {
      console.error("[work-photo] изпращането падна:", err);
      setErrors({ form: typeof navigator !== "undefined" && navigator.onLine === false ? NO_CONNECTION : E.storage });
      setRetry(true);
      setSending(false);
      return;
    }
    if (!res.ok) {
      setErrors({ [uploadErrorField(res.error)]: res.error });
      setSending(false);
      return;
    }
    navigator.vibrate?.(10);
    router.push(`/staff/profile/photos?sent=${encodeURIComponent(res.id)}`);
  }

  const fieldBox =
    "h-12 w-full rounded-xl border border-border bg-card px-4 text-base text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive";

  return (
    <>
      <button
        type="button"
        onClick={() => {
          // Листът се отваря веднага: ако камерата се затвори без снимка, остават «Снимай» и «Избери от галерията».
          setOpen(true);
          cameraRef.current?.click();
        }}
        className={className}
      >
        <Camera className="size-5" strokeWidth={1.7} aria-hidden />
        {label}
      </button>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} aria-hidden onChange={onPick} />
      <input ref={galleryRef} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden onChange={onPick} />

      <Dialog.Root
        open={open}
        onOpenChange={(o) => {
          if (sending) return;
          setOpen(o);
          if (!o) reset();
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 lg:bg-foreground/10" />
          <Dialog.Content
            aria-describedby={undefined}
            className={cn(
              "fixed inset-x-0 bottom-0 z-50 flex max-h-[calc(100svh-9rem)] flex-col rounded-t-3xl bg-background shadow-elegant outline-none",
              "data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom data-[state=open]:duration-300 data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=closed]:duration-200",
              "lg:inset-y-0 lg:left-auto lg:right-0 lg:max-h-none lg:w-[34rem] lg:rounded-none lg:border-l lg:border-border",
              "lg:data-[state=open]:slide-in-from-right lg:data-[state=closed]:slide-out-to-right lg:[--tw-enter-translate-y:0] lg:[--tw-exit-translate-y:0]",
            )}
          >
            <div className="mx-auto mt-2.5 h-1 w-9 shrink-0 rounded-full bg-foreground/15 lg:hidden" aria-hidden />
            <div className="flex shrink-0 items-center justify-between gap-3 px-5 pb-3 pt-3 lg:px-8 lg:pb-5 lg:pt-7">
              <Dialog.Title className="font-display text-xl font-medium lg:text-[1.75rem]">Снимка от работата</Dialog.Title>
              <Dialog.Close
                aria-label="Затвори"
                className="-mr-3 hidden size-12 place-items-center rounded-full text-foreground/80 transition-colors hover:bg-secondary lg:grid"
              >
                <X className="size-6" strokeWidth={1.6} />
              </Dialog.Close>
            </div>

            <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 lg:px-8">
                {/* Снимката */}
                <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-secondary lg:aspect-auto lg:h-[17rem]">
                  {picked ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={picked.previewUrl} alt="Избраната снимка" className="size-full object-cover" />
                  ) : (
                    <div className="grid size-full place-items-center text-muted-foreground">
                      {preparing ? <Loader2 className="size-7 animate-spin" aria-hidden /> : <ImageOff className="size-8" strokeWidth={1.4} aria-hidden />}
                    </div>
                  )}
                </div>
                {errors.file && (
                  <p id="wp-file-err" role="alert" className="mt-2 text-sm text-destructive">
                    {errors.file}
                  </p>
                )}
                <div className="flex justify-center lg:justify-start">
                  <button
                    type="button"
                    onClick={() => cameraRef.current?.click()}
                    aria-describedby={errors.file ? "wp-file-err" : undefined}
                    className="inline-flex h-12 items-center gap-2 px-2 text-sm font-medium text-foreground/75 transition-colors hover:text-foreground lg:-ml-2 lg:text-base lg:font-semibold lg:text-primary"
                  >
                    <RefreshCw className="size-4 lg:size-5" strokeWidth={1.8} aria-hidden />
                    {picked ? "Снимай пак" : "Снимай"}
                  </button>
                </div>

                {/* Услуга */}
                <div className="mt-1">
                  <label htmlFor="wp-service" className="mb-1.5 block text-[15px] font-medium lg:text-[17px] lg:font-semibold">
                    Услуга
                  </label>
                  <div className="relative">
                    <select
                      id="wp-service"
                      value={serviceId}
                      onChange={(ev) => {
                        setServiceId(ev.target.value);
                        setErrors((er) => ({ ...er, service: undefined }));
                      }}
                      aria-invalid={errors.service ? true : undefined}
                      aria-describedby={errors.service ? "wp-service-err" : booking ? "wp-service-from" : undefined}
                      className={cn(fieldBox, "appearance-none pr-11 lg:text-lg")}
                    >
                      {!serviceId && <option value="">Избери услуга</option>}
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-foreground/70" strokeWidth={1.8} aria-hidden />
                  </div>
                  {booking && serviceId && serviceId === booking.serviceItemId && (
                    <p id="wp-service-from" className="mt-1.5 text-[15px] text-muted-foreground lg:text-sm">
                      От часа в {booking.timeLabel}
                    </p>
                  )}
                  {errors.service && (
                    <p id="wp-service-err" role="alert" className="mt-1.5 text-sm text-destructive">
                      {errors.service}
                    </p>
                  )}
                </div>

                {/* Какво се вижда? */}
                <div className="mt-5">
                  <label htmlFor="wp-note" className="mb-1.5 block text-[15px] font-medium lg:text-[17px] lg:font-semibold">
                    Какво се вижда? <span className="font-normal text-muted-foreground">(незадължително)</span>
                  </label>
                  <input
                    id="wp-note"
                    type="text"
                    value={note}
                    onChange={(ev) => {
                      setNote(ev.target.value);
                      setErrors((er) => ({ ...er, note: undefined }));
                    }}
                    maxLength={STAFF_NOTE_MAX}
                    enterKeyHint="done"
                    autoComplete="off"
                    aria-invalid={errors.note ? true : undefined}
                    aria-describedby={errors.note ? "wp-note-hint wp-note-err" : "wp-note-hint"}
                    className={fieldBox}
                  />
                  <p id="wp-note-hint" className="mt-1.5 text-[15px] text-muted-foreground lg:text-sm">
                    {noteHintForService(serviceName)}
                  </p>
                  {errors.note && (
                    <p id="wp-note-err" role="alert" className="mt-1 text-sm text-destructive">
                      {errors.note}
                    </p>
                  )}
                </div>

                {/* Без лице */}
                <div className="mt-5">
                  <label
                    className={cn(
                      "flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border bg-card px-4 py-2 text-base transition-colors",
                      errors.noFace ? "border-destructive" : "border-border",
                    )}
                  >
                    <input
                      ref={noFaceRef}
                      type="checkbox"
                      checked={noFace}
                      onChange={(ev) => {
                        setNoFace(ev.target.checked);
                        setErrors((er) => ({ ...er, noFace: undefined }));
                      }}
                      aria-invalid={errors.noFace ? true : undefined}
                      aria-describedby={errors.noFace ? "wp-noface-why wp-noface-err" : "wp-noface-why"}
                      className="size-5 shrink-0 scroll-mb-40 accent-primary"
                    />
                    На снимката не се вижда лице
                  </label>
                  <p id="wp-noface-why" className="mt-1.5 text-sm text-muted-foreground">
                    Снимки с лице на клиент засега не се качват.
                  </p>
                </div>

                {/* Главният бутон: закачен долу, докато листът се превърта */}
                <div className="sticky bottom-0 -mx-5 mt-4 bg-background px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-3 lg:-mx-8 lg:mt-6 lg:px-8 lg:pb-8">
                  {/* Без отметката бутонът казва какво липсва: грешката стои точно над него */}
                  {errors.noFace && (
                    <p id="wp-noface-err" role="alert" className="mb-2.5 text-sm text-destructive">
                      {errors.noFace}
                    </p>
                  )}
                  {errors.form && (
                    <p role="alert" className="mb-2.5 text-sm text-destructive">
                      {errors.form}
                    </p>
                  )}
                  <button
                    type="submit"
                    aria-disabled={sending || undefined}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90 aria-disabled:opacity-70"
                  >
                    {sending && <Loader2 className="size-4 animate-spin" aria-hidden />}
                    {sending ? "Изпращане…" : retry ? "Изпрати пак" : "Изпрати за одобрение"}
                  </button>
                  <div className="mt-1 flex justify-center">
                    <button
                      type="button"
                      onClick={() => galleryRef.current?.click()}
                      className="inline-flex h-11 items-center px-2 text-sm font-medium text-primary underline underline-offset-4 transition-colors hover:text-primary/80"
                    >
                      Избери от галерията
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
