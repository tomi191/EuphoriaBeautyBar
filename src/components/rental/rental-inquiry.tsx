"use client";

import * as React from "react";
import Link from "next/link";
import { Check, MessageCircle, Phone, X } from "lucide-react";
import { nanoid } from "nanoid";
import { Dialog as DialogPrimitive } from "radix-ui";
import { submitRentalInquiry } from "@/lib/actions/rental-inquiries";
import { INQUIRY_COPY as C, INQUIRY_LIMITS, validateInquiry, type InquiryFieldErrors } from "@/lib/rental/inquiry-rules";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

/*
 * Запитване до Снежана от обявата «Място под наем» (визия №18, кадри Б-запитване-390 и -1440).
 * Главен бутон «Изпрати запитване» и два кръгли (обаждане, Viber); на телефон в долната лента, на
 * компютър до заглавието. Формата: на телефон лист на цял екран, на компютър панел отдясно.
 * Текстовете са на Саиф (части 5 и 6), без обещан срок за отговор.
 */

type Ctx = { openFrom: (el: HTMLElement | null) => void };
const InquiryContext = React.createContext<Ctx | null>(null);

const ring = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

function useInquiry(): Ctx {
  const ctx = React.useContext(InquiryContext);
  if (!ctx) throw new Error("RentalInquiryProvider липсва");
  return ctx;
}

function CircleLinks({ size }: { size: string }) {
  const circle = cn(
    "grid shrink-0 place-items-center rounded-full border border-foreground/70 bg-background text-foreground transition-colors hover:bg-secondary",
    ring,
    size,
  );
  return (
    <>
      <a href={`tel:${siteConfig.contact.phone}`} aria-label="Обади се" className={circle}>
        <Phone className="size-[1.375rem]" strokeWidth={1.5} aria-hidden />
      </a>
      <a href={siteConfig.social.viber} aria-label="Пиши във Viber" className={circle}>
        <MessageCircle className="size-[1.375rem]" strokeWidth={1.5} aria-hidden />
      </a>
    </>
  );
}

function MainButton({ className }: { className?: string }) {
  const { openFrom } = useInquiry();
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      onClick={(e) => openFrom(e.currentTarget)}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-full bg-foreground font-medium text-background transition-colors hover:bg-foreground/90",
        ring,
        className,
      )}
    >
      Изпрати запитване
    </button>
  );
}

/** Бутоните в страницата (компютър). */
export function InquiryButtons({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-4", className)}>
      <MainButton className="h-14 px-10 text-lg" />
      <CircleLinks size="size-14" />
    </div>
  );
}

/**
 * Долната лента на телефон (заменя общата на /karieri). `data-rental-bar` дава на обвивката в
 * layout-а място отдолу; височината е в `--rental-bar-h` (globals.css).
 */
export function InquiryBar() {
  return (
    <div
      data-rental-bar
      className="fixed inset-x-0 bottom-0 z-40 grid h-[calc(var(--rental-bar-h)+env(safe-area-inset-bottom))] grid-cols-[minmax(0,1fr)_auto_auto] content-center items-center gap-2 border-t border-border/60 bg-background/95 px-3 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <MainButton className="h-[52px] px-3 text-lg" />
      <CircleLinks size="size-[52px]" />
    </div>
  );
}

type Fields = { name: string; phone: string; specialty: string; message: string; consent: boolean };

const fieldBox =
  "w-full rounded-xl border border-primary/45 bg-background px-4 text-base text-foreground placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 aria-[invalid=true]:border-destructive";

function FieldError({ id, text }: { id: string; text?: string }) {
  if (!text) return null;
  return (
    <p id={id} className="mt-2 text-[0.9375rem] leading-snug text-destructive">
      {text}
    </p>
  );
}

export function RentalInquiryProvider({
  slug,
  listingTitle,
  specialty,
  children,
}: {
  slug: string;
  listingTitle: string;
  specialty: string;
  children: React.ReactNode;
}) {
  const empty = React.useCallback(
    (): Fields => ({ name: "", phone: "", specialty, message: "", consent: false }),
    [specialty],
  );
  const [open, setOpen] = React.useState(false);
  const [view, setView] = React.useState<"form" | "done">("form");
  const [fields, setFields] = React.useState<Fields>(empty);
  const [errors, setErrors] = React.useState<InquiryFieldErrors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [token, setToken] = React.useState(() => nanoid());
  const pendingRef = React.useRef(false);
  const triggerRef = React.useRef<HTMLElement | null>(null);
  const titleRef = React.useRef<HTMLHeadingElement>(null);
  const doneRef = React.useRef<HTMLHeadingElement>(null);
  const honeyRef = React.useRef<HTMLInputElement>(null);
  const refs = {
    name: React.useRef<HTMLInputElement>(null),
    phone: React.useRef<HTMLInputElement>(null),
    consent: React.useRef<HTMLInputElement>(null),
  };

  const ctx = React.useMemo<Ctx>(
    () => ({
      openFrom: (el) => {
        triggerRef.current = el;
        setOpen(true);
      },
    }),
    [],
  );

  React.useEffect(() => {
    if (view === "done") doneRef.current?.focus();
  }, [view]);

  function onOpenChange(next: boolean) {
    setOpen(next);
    // След «Получихме го.» формата е пак празна, с нов ключ (ново запитване = нов ред).
    if (!next && view === "done") {
      setView("form");
      setFields(empty());
      setErrors({});
      setFormError(null);
      setToken(nanoid());
    }
  }

  function set<K extends keyof Fields>(key: K, value: Fields[K]) {
    setFields((f) => ({ ...f, [key]: value }));
    if (key in errors) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function focusFirst(errs: InquiryFieldErrors) {
    const first = (["name", "phone", "consent"] as const).find((k) => errs[k]);
    if (first) refs[first].current?.focus();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pendingRef.current) return;
    setFormError(null);
    const local = validateInquiry(fields);
    if (!local.ok) {
      setErrors(local.errors);
      focusFirst(local.errors);
      return;
    }
    pendingRef.current = true;
    setPending(true);
    try {
      const res = await submitRentalInquiry({
        slug,
        token,
        ...fields,
        website: honeyRef.current?.value ?? "",
        // Метката от адреса (например от поста във Facebook): без бисквитки, само адресът.
        cameFrom: window.location.search || null,
      });
      if (res.ok) {
        setErrors({});
        setView("done");
      } else if (res.fieldErrors) {
        setErrors(res.fieldErrors);
        focusFirst(res.fieldErrors);
      } else {
        setFormError(res.error ?? C.errSend);
      }
    } catch {
      setFormError(C.errSend);
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  const call = (
    <p className="text-[0.9375rem] leading-snug text-muted-foreground">
      Предпочиташ разговор? Обади се на{" "}
      <a href={`tel:${siteConfig.contact.phone}`} className="whitespace-nowrap text-foreground underline underline-offset-4">
        {siteConfig.contact.phoneFormatted}
      </a>{" "}
      или{" "}
      <a href={siteConfig.social.viber} className="text-foreground underline underline-offset-4">
        пиши във Viber
      </a>
      .
    </p>
  );

  return (
    <InquiryContext.Provider value={ctx}>
      {children}
      <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-transparent data-[state=open]:animate-in data-[state=open]:fade-in-0 lg:bg-foreground/25" />
          <DialogPrimitive.Content
            data-inquiry-view={view}
            onOpenAutoFocus={(e) => {
              e.preventDefault();
              // На компютър курсорът е в първото поле; на телефон фокусът е на заглавието, за да не
              // изскочи клавиатурата върху формата.
              if (window.matchMedia("(min-width: 1024px)").matches) refs.name.current?.focus();
              else titleRef.current?.focus();
            }}
            onCloseAutoFocus={(e) => {
              if (triggerRef.current?.isConnected) {
                e.preventDefault();
                triggerRef.current.focus();
              }
            }}
            className={cn(
              "fixed inset-x-0 bottom-0 z-50 flex flex-col bg-background outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-4 lg:inset-y-0 lg:right-0 lg:left-auto lg:w-[26.5rem] lg:shadow-xl lg:data-[state=open]:slide-in-from-right-8",
              view === "done" ? "top-20 lg:top-0" : "top-0",
            )}
          >
            <DialogPrimitive.Close
              className={cn(
                "absolute top-5 right-3 z-10 grid size-12 place-items-center rounded-full text-foreground hover:bg-secondary lg:top-4 lg:right-4",
                ring,
                view === "done" && "hidden lg:grid",
              )}
            >
              <X className="size-7" strokeWidth={1.5} aria-hidden />
              <span className="sr-only">Затвори</span>
            </DialogPrimitive.Close>

            {view === "form" ? (
              <form noValidate onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col lg:block lg:overflow-y-auto">
                <div className="min-h-0 flex-1 overflow-y-auto px-[1.875rem] pt-6 pb-6 lg:overflow-visible lg:px-8 lg:pt-14 lg:pb-0">
                  <DialogPrimitive.Title
                    ref={titleRef}
                    tabIndex={-1}
                    className="pr-12 text-[2.125rem] font-medium leading-[1.08] outline-none lg:text-[1.75rem]"
                  >
                    {C.title}
                  </DialogPrimitive.Title>
                  <p className="mt-3 font-serif text-[1.65rem] italic leading-tight text-primary lg:mt-2 lg:text-[1.75rem]">
                    {listingTitle}
                  </p>
                  <DialogPrimitive.Description className="mt-3 text-[0.9375rem] leading-snug text-muted-foreground">
                    {C.lead}
                  </DialogPrimitive.Description>

                  <div className="mt-7 space-y-4 lg:mt-6">
                    <div>
                      <label htmlFor="inq-name" className="block text-[1.0625rem] leading-snug lg:text-lg">
                        {C.nameLabel}
                      </label>
                      <input
                        ref={refs.name}
                        id="inq-name"
                        name="name"
                        autoComplete="name"
                        maxLength={INQUIRY_LIMITS.name}
                        placeholder={C.namePlaceholder}
                        value={fields.name}
                        onChange={(e) => set("name", e.target.value)}
                        aria-invalid={errors.name ? true : undefined}
                        aria-describedby={errors.name ? "inq-name-err" : undefined}
                        className={cn(fieldBox, "mt-2 h-12")}
                      />
                      <FieldError id="inq-name-err" text={errors.name} />
                    </div>
                    <div>
                      <label htmlFor="inq-phone" className="block text-[1.0625rem] leading-snug lg:text-lg">
                        {C.phoneLabel}
                      </label>
                      <input
                        ref={refs.phone}
                        id="inq-phone"
                        name="phone"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        maxLength={INQUIRY_LIMITS.phone}
                        placeholder={C.phonePlaceholder}
                        value={fields.phone}
                        onChange={(e) => set("phone", e.target.value)}
                        aria-invalid={errors.phone ? true : undefined}
                        aria-describedby={errors.phone ? "inq-phone-err" : undefined}
                        className={cn(fieldBox, "mt-2 h-12")}
                      />
                      <FieldError id="inq-phone-err" text={errors.phone} />
                    </div>
                    <div>
                      <label htmlFor="inq-specialty" className="block text-[1.0625rem] leading-snug lg:text-lg">
                        {C.specialtyLabel}
                      </label>
                      <input
                        id="inq-specialty"
                        name="specialty"
                        maxLength={INQUIRY_LIMITS.specialty}
                        value={fields.specialty}
                        onChange={(e) => set("specialty", e.target.value)}
                        aria-describedby="inq-specialty-hint"
                        className={cn(fieldBox, "mt-2 h-12")}
                      />
                      <p id="inq-specialty-hint" className="mt-1.5 text-sm text-muted-foreground">
                        {C.specialtyHint}
                      </p>
                    </div>
                    <div>
                      <label htmlFor="inq-message" className="block text-[1.0625rem] leading-snug lg:text-lg">
                        {C.messageLabel} <span className="text-muted-foreground">({C.optional})</span>
                      </label>
                      <textarea
                        id="inq-message"
                        name="message"
                        rows={2}
                        maxLength={INQUIRY_LIMITS.message}
                        placeholder={C.messagePlaceholder}
                        value={fields.message}
                        onChange={(e) => set("message", e.target.value)}
                        className={cn(fieldBox, "mt-2 block min-h-16 resize-y py-3 leading-snug lg:min-h-[5rem]")}
                      />
                    </div>

                    {/* Капанът: скрит от хората и от екранните четци; роботът го попълва. */}
                    <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
                      <label htmlFor="inq-website">Уебсайт</label>
                      <input ref={honeyRef} id="inq-website" name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
                    </div>

                    <div>
                      <div className="flex items-start gap-3">
                        <span className="relative mt-0.5 grid size-6 shrink-0 place-items-center">
                          <input
                            ref={refs.consent}
                            id="inq-consent"
                            name="consent"
                            type="checkbox"
                            checked={fields.consent}
                            onChange={(e) => set("consent", e.target.checked)}
                            aria-invalid={errors.consent ? true : undefined}
                            aria-describedby={errors.consent ? "inq-consent-err" : undefined}
                            className={cn(
                              "peer size-6 cursor-pointer appearance-none rounded-[5px] border-[1.5px] border-foreground/55 bg-background checked:border-primary checked:bg-primary aria-[invalid=true]:border-destructive",
                              ring,
                            )}
                          />
                          <Check
                            className="pointer-events-none absolute size-4 text-primary-foreground opacity-0 peer-checked:opacity-100"
                            strokeWidth={2.5}
                            aria-hidden
                          />
                        </span>
                        <label htmlFor="inq-consent" className="cursor-pointer text-[0.9375rem] leading-snug">
                          {C.consent}
                        </label>
                      </div>
                      <Link
                        href="/politika-za-poveritelnost"
                        target="_blank"
                        className="mt-2 ml-9 inline-block text-[0.9375rem] text-primary underline underline-offset-4"
                      >
                        {C.privacyLink}
                      </Link>
                      <FieldError id="inq-consent-err" text={errors.consent} />
                    </div>

                    {formError && (
                      <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-[0.9375rem] leading-snug text-destructive">
                        {formError}
                      </p>
                    )}
                    <div className="lg:hidden">{call}</div>
                  </div>
                </div>

                <div className="border-t border-border/60 bg-background px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] lg:border-0 lg:px-8 lg:pt-8 lg:pb-10">
                  <button
                    type="submit"
                    aria-disabled={pending || undefined}
                    className={cn(
                      "inline-flex h-[52px] w-full items-center justify-center whitespace-nowrap rounded-full bg-foreground text-lg font-medium text-background transition-colors hover:bg-foreground/90 aria-disabled:opacity-70 lg:h-14",
                      ring,
                    )}
                  >
                    {pending ? "Изпращам…" : C.submit}
                  </button>
                  <div className="mt-4 hidden lg:block">{call}</div>
                </div>
              </form>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col" aria-live="polite">
                <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                  <svg viewBox="0 0 150 150" className="size-[9.5rem] text-primary/80" aria-hidden="true">
                    <circle cx="75" cy="75" r="72" fill="none" stroke="currentColor" strokeWidth="3" />
                    <path d="M46 78 l20 21 l39 -44" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <DialogPrimitive.Title
                    ref={doneRef}
                    tabIndex={-1}
                    className="mt-10 text-[2.6875rem] font-medium leading-tight outline-none"
                  >
                    {C.doneTitle}
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Description className="mt-4 font-serif text-[2.125rem] italic leading-tight text-primary">
                    {C.doneText}
                  </DialogPrimitive.Description>
                </div>
                <div className="border-t border-border/60 px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] lg:border-0 lg:px-8 lg:pb-10">
                  <DialogPrimitive.Close
                    className={cn(
                      "inline-flex h-[52px] w-full items-center justify-center rounded-full border border-foreground text-lg font-medium transition-colors hover:bg-secondary lg:h-14",
                      ring,
                    )}
                  >
                    {C.doneBack}
                  </DialogPrimitive.Close>
                </div>
              </div>
            )}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </InquiryContext.Provider>
  );
}
