"use client";

import * as React from "react";
import { CalendarCheck, Loader2, Images, Scissors, Droplets, Hand, Sparkles, Check, X, Clock, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createPublicBooking, fetchPublicSlots } from "@/lib/actions/public-booking";
import type { DaySlot } from "@/lib/booking/slots";
import { formatServicePrice, priceVaries } from "@/lib/booking/price";

export interface PublicServiceOpt {
  id: string;
  name: string;
  durationMin: number;
  bufferMin: number;
  category: string;
  groupTitle: string;
  kind: string;
  price: number;
  priceMax: number | null;
  priceFrom: boolean;
  currency: string;
}

const formatPrice = formatServicePrice;

/** Уникални стойности, запазвайки реда на въвеждане. */
function uniq(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) if (!seen.has(v)) { seen.add(v); out.push(v); }
  return out;
}

const chipCls = (active: boolean) =>
  "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors " +
  (active ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground/50");

/** Икона по категория (по shortTitle). Непознатите категории остават без икона. */
const CATEGORY_ICON: Record<string, LucideIcon> = {
  Фризьор: Scissors,
  Терапии: Droplets,
  Маникюр: Hand,
  Козметика: Sparkles,
};

export interface OfferingData {
  price: number;
  priceMax: number | null;
  priceFrom: boolean;
  currency: string;
  durationMin: number;
  bufferMin: number;
}

export interface PerformerOpt {
  id: string;
  name: string;
  kind: string;
  image: string | null;
  bio: string | null;
  portfolio: { src: string; alt: string }[];
  /** Дали изпълнителят е „curated" (има собствен списък услуги). */
  curated: boolean;
  /** Собствени цени/продължителности по serviceItemId. */
  offerings: Record<string, OfferingData>;
}

/** Връща цената/продължителността на услуга за конкретен изпълнител (own или каталожна). */
function resolveOffering(svc: PublicServiceOpt, performer: PerformerOpt | undefined): OfferingData {
  const own = performer?.offerings[svc.id];
  if (own) return own;
  return {
    price: svc.price,
    priceMax: svc.priceMax,
    priceFrom: svc.priceFrom,
    currency: svc.currency,
    durationMin: svc.durationMin,
    bufferMin: svc.bufferMin,
  };
}

function slotLabel(iso: string) {
  return new Intl.DateTimeFormat("bg-BG", { timeZone: "Europe/Sofia", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
}

function todayStr() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Sofia", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/** Бързи бутони за дата: днес + следващите дни. */
function quickDates(count: number): { value: string; label: string }[] {
  const fmtDay = new Intl.DateTimeFormat("bg-BG", { timeZone: "Europe/Sofia", weekday: "short", day: "numeric", month: "short" });
  const fmtISO = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Sofia", year: "numeric", month: "2-digit", day: "2-digit" });
  const out: { value: string; label: string }[] = [];
  const base = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(base.getTime() + i * 86400000);
    out.push({ value: fmtISO.format(d), label: i === 0 ? "Днес" : i === 1 ? "Утре" : fmtDay.format(d) });
  }
  return out;
}

/** Кръгъл аватар на изпълнител — логото-mark на салона е fallback, ако няма снимка. */
function PerformerAvatar({ image, size = 56 }: { image: string | null; size?: number }) {
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-full border border-border bg-secondary"
      style={{ width: size, height: size }}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="size-full object-cover" />
      ) : (
        <div className="grid size-full place-items-center p-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/brand/logo-mark-black.png" alt="" className="size-full object-contain dark:hidden" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/brand/logo-mark-white.png" alt="" className="hidden size-full object-contain dark:block" />
        </div>
      )}
    </div>
  );
}

export function PublicBookingForm({ services, performers }: { services: PublicServiceOpt[]; performers: PerformerOpt[] }) {
  const [categoryName, setCategoryName] = React.useState("");
  const [groupTitle, setGroupTitle] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [performerId, setPerformerId] = React.useState("");
  const [date, setDate] = React.useState(todayStr());
  const [slots, setSlots] = React.useState<DaySlot[]>([]);
  const [dayClosed, setDayClosed] = React.useState(false);
  const [slot, setSlot] = React.useState("");
  const [loadingSlots, setLoadingSlots] = React.useState(false);
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [consent, setConsent] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");
  const [done, setDone] = React.useState<{ when: string; service: string; who: string } | null>(null);
  const [lightbox, setLightbox] = React.useState<PerformerOpt | null>(null);

  // Избрани услуги (в реда на добавяне) — поддържа няколко последователни услуги в един визит.
  const selectedServices = React.useMemo(
    () => selectedIds.map((id) => services.find((s) => s.id === id)).filter(Boolean) as PublicServiceOpt[],
    [selectedIds, services],
  );
  const activeKind = selectedServices[0]?.kind ?? "";
  const hasSelection = selectedServices.length > 0;
  const serviceNamesLabel = selectedServices.map((s) => s.name).join(" + ");

  const categories = React.useMemo(() => uniq(services.map((s) => s.category)), [services]);
  const groups = React.useMemo(
    () => (categoryName ? uniq(services.filter((s) => s.category === categoryName).map((s) => s.groupTitle)) : []),
    [services, categoryName],
  );
  const groupItems = React.useMemo(
    () => services.filter((s) => s.category === categoryName && s.groupTitle === groupTitle),
    [services, categoryName, groupTitle],
  );

  // Навигация по категория/подкатегория НЕ нулира избора — позволява добавяне на услуги от различни видове.
  function chooseCategory(c: string) {
    if (c === categoryName) {
      setCategoryName("");
      setGroupTitle("");
      return;
    }
    setCategoryName(c);
    const g = uniq(services.filter((s) => s.category === c).map((s) => s.groupTitle));
    setGroupTitle(g.length === 1 ? g[0] : "");
  }

  function chooseGroup(g: string) {
    setGroupTitle(g);
  }

  // Добавя/маха услуга. Всички избрани трябва да са за един изпълнител (същия kind).
  function toggleService(s: PublicServiceOpt) {
    setSelectedIds((prev) => {
      if (prev.includes(s.id)) return prev.filter((id) => id !== s.id);
      if (hasSelection && s.kind !== activeKind) return prev; // различен тип → различен изпълнител, не се комбинира
      return [...prev, s.id];
    });
  }

  // Изпълнители за избраните услуги: за същия тип, и (ако са curated) предлагат всички избрани.
  const availablePerformers = React.useMemo(() => {
    if (!hasSelection) return [];
    return performers.filter(
      (p) => p.kind === activeKind && (!p.curated || selectedServices.every((s) => p.offerings[s.id])),
    );
  }, [hasSelection, activeKind, selectedServices, performers]);
  const performer = performers.find((p) => p.id === performerId);

  // Дали избраният слот е паралелен (в престоя на чужд час) — определя allowParallel при записа.
  const slotIsParallel = React.useMemo(
    () => slots.some((s) => s.start === slot && s.status === "parallel"),
    [slots, slot],
  );

  // Общо време = сума на собствените продължителности на избрания изпълнител (или каталожни преди избор).
  const totalDuration = selectedServices.reduce((sum, s) => sum + resolveOffering(s, performer).durationMin, 0);
  const totalBuffer = selectedServices.reduce((sum, s) => sum + resolveOffering(s, performer).bufferMin, 0);

  // При смяна на типа услуги: ако има само един изпълнител за този тип — избери го автоматично.
  React.useEffect(() => {
    if (!activeKind) {
      setPerformerId("");
      return;
    }
    const avail = performers.filter((p) => p.kind === activeKind);
    setPerformerId((cur) => (avail.some((p) => p.id === cur) ? cur : avail.length === 1 ? avail[0].id : ""));
  }, [activeKind]); // eslint-disable-line react-hooks/exhaustive-deps

  // Зареди дневния график за избрания изпълнител и сумарната продължителност.
  React.useEffect(() => {
    if (!hasSelection || !performerId || !date) {
      setSlots([]);
      setDayClosed(false);
      return;
    }
    let cancelled = false;
    setLoadingSlots(true);
    setSlot("");
    fetchPublicSlots(performerId, date, totalDuration, totalBuffer, true)
      .then((res) => {
        if (cancelled) return;
        setSlots(res.slots);
        setDayClosed(res.open === null);
      })
      .catch(() => {
        if (cancelled) return;
        setSlots([]);
        setDayClosed(false);
      })
      .finally(() => !cancelled && setLoadingSlots(false));
    return () => {
      cancelled = true;
    };
  }, [performerId, date, totalDuration, totalBuffer]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!hasSelection || !performerId || !slot || !consent) {
      setError("Избери поне една услуга, изпълнител, час и приеми условията.");
      return;
    }
    setSubmitting(true);
    try {
      const single = selectedServices.length === 1 ? selectedServices[0] : null;
      // Снимка на сумата (€) при записването - сборът от цените на избраните услуги при този изпълнител.
      const totalPrice = selectedServices.reduce((sum, s) => sum + resolveOffering(s, performer).price, 0);
      const res = await createPublicBooking({
        resourceId: performerId,
        serviceItemId: single ? single.id : null,
        serviceName: serviceNamesLabel,
        priceLabel: single ? formatPrice(resolveOffering(single, performer)) : null,
        priceEur: Math.round(totalPrice * 100) / 100,
        durationMin: totalDuration,
        bufferMin: totalBuffer,
        startAt: slot,
        clientName: name,
        clientPhone: phone,
        clientEmail: email,
        consentLate: true,
        allowParallel: slotIsParallel,
      });
      if (res.ok) {
        setDone({ when: `${date}, ${slotLabel(slot)} ч.`, service: serviceNamesLabel, who: performer?.name ?? "" });
      } else {
        setError(res.error);
      }
    } catch {
      setError("Възникна грешка. Опитай пак или се обади.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-mint bg-mint/20 p-8 text-center">
        <CalendarCheck className="mx-auto size-10 text-primary" strokeWidth={1.5} />
        <h2 className="mt-4 font-display text-2xl font-medium">Часът е запазен!</h2>
        <p className="mt-2 text-foreground/80">
          {done.service}
          {done.who ? ` при ${done.who}` : ""} — {done.when}
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Изпратихме потвърждение на имейла ти. Отказ само по телефон, минимум 5 часа преди часа.
        </p>
      </div>
    );
  }

  const singlePerformer = availablePerformers.length === 1;

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-border bg-background p-6 md:p-8">
        {/* Стъпка 1 — категория */}
        <div className="space-y-2">
          <Label>Категория</Label>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => {
              const Icon = CATEGORY_ICON[c];
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => chooseCategory(c)}
                  className={chipCls(categoryName === c) + " inline-flex items-center gap-1.5"}
                >
                  {Icon && <Icon className="size-4" strokeWidth={1.6} />}
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        {/* Стъпка 2 — подкатегория (само ако има повече от една) */}
        {categoryName && groups.length > 1 && (
          <div className="space-y-2">
            <Label>Вид</Label>
            <div className="flex flex-wrap gap-1.5">
              {groups.map((g) => (
                <button key={g} type="button" onClick={() => chooseGroup(g)} className={chipCls(groupTitle === g)}>
                  {g}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Стъпка 3 — услуга (може повече от една при същия изпълнител) */}
        {groupTitle && (
          <div className="space-y-2">
            <Label>
              Услуга <span className="font-normal text-muted-foreground">· може и няколко</span>
            </Label>
            <div className="space-y-1.5">
              {groupItems.map((s) => {
                const selected = selectedIds.includes(s.id);
                const disabled = hasSelection && !selected && s.kind !== activeKind;
                return (
                  <button
                    key={s.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => toggleService(s)}
                    className={
                      "flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition-colors " +
                      (selected
                        ? "border-foreground bg-secondary"
                        : disabled
                          ? "cursor-not-allowed border-border opacity-40"
                          : "border-border hover:border-foreground/50")
                    }
                  >
                    <span className="flex items-center gap-2.5">
                      <span
                        className={
                          "grid size-5 shrink-0 place-items-center rounded-md border " +
                          (selected ? "border-foreground bg-foreground text-background" : "border-input")
                        }
                      >
                        {selected && <Check className="size-3.5" strokeWidth={2.5} />}
                      </span>
                      <span className="font-medium leading-tight">{s.name}</span>
                    </span>
                    <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
                      {s.durationMin} мин · {formatPrice(s)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Обобщение на избраните услуги + общо време + disclaimer */}
        {hasSelection && (
          <div className="rounded-lg border border-border bg-secondary/40 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">
                Избрани {selectedServices.length > 1 ? `услуги (${selectedServices.length})` : "услуга"}
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
                <Clock className="size-3.5" /> ~{totalDuration} мин
              </span>
            </div>
            <ul className="space-y-1.5">
              {selectedServices.map((s) => (
                <li key={s.id} className="flex items-center gap-2 text-sm">
                  <button
                    type="button"
                    onClick={() => toggleService(s)}
                    aria-label={`Премахни ${s.name}`}
                    className="grid size-5 shrink-0 place-items-center rounded text-muted-foreground hover:bg-background hover:text-destructive"
                  >
                    <X className="size-3.5" />
                  </button>
                  <span className="flex-1 leading-tight">{s.name}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">{formatPrice(resolveOffering(s, performer))}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
              {selectedServices.some((s) => priceVaries(resolveOffering(s, performer)))
                ? "Цените са ориентировъчни. Крайната сума зависи от обема на работата и използваните продукти - уточнява се на място."
                : "Цените са ориентировъчни и може да варират според обема на работата и използваните продукти."}
            </p>
          </div>
        )}

        {hasSelection && availablePerformers.length === 0 && (
          <p className="rounded-lg border border-border bg-secondary/50 p-3 text-sm text-muted-foreground">
            Няма изпълнител, който да предлага всички избрани услуги заедно. Махни някоя услуга или се обади да уточним.
          </p>
        )}

        {hasSelection && availablePerformers.length > 0 && (
          <div className="space-y-2">
            <Label>{singlePerformer ? "Изпълнител" : "Избери изпълнител"}</Label>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {availablePerformers.map((p) => {
                const selected = performerId === p.id;
                return (
                  <div
                    key={p.id}
                    role={singlePerformer ? undefined : "button"}
                    tabIndex={singlePerformer ? undefined : 0}
                    onClick={singlePerformer ? undefined : () => setPerformerId(p.id)}
                    onKeyDown={
                      singlePerformer
                        ? undefined
                        : (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setPerformerId(p.id);
                            }
                          }
                    }
                    className={
                      "flex gap-3 rounded-xl border p-3 text-left transition-colors " +
                      (singlePerformer ? "border-border" : "cursor-pointer ") +
                      (selected && !singlePerformer ? "border-foreground bg-secondary" : !singlePerformer ? "border-border hover:border-foreground/50" : "")
                    }
                  >
                    <PerformerAvatar image={p.image} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium leading-tight">{p.name}</p>
                      {p.bio && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{p.bio}</p>}
                      {p.portfolio.length > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLightbox(p);
                          }}
                          className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        >
                          <Images className="size-3.5" /> Виж работа ({p.portfolio.length})
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="bf-date">Дата</Label>
          <div className="flex flex-wrap gap-1.5">
            {quickDates(7).map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => setDate(d.value)}
                className={
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
                  (date === d.value ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground/50")
                }
              >
                {d.label}
              </button>
            ))}
          </div>
          <Input id="bf-date" type="date" value={date} min={todayStr()} onChange={(e) => setDate(e.target.value)} className="h-11" />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Час</Label>
            {performerId && !loadingSlots && !dayClosed && slots.length > 0 && (
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="size-2.5 rounded-full border border-foreground/40 bg-background" /> свободно
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-2.5 rounded-full bg-secondary" /> заето
                </span>
                {slots.some((s) => s.status === "parallel") && (
                  <span className="flex items-center gap-1">
                    <span className="size-2.5 rounded-full border border-dashed border-primary/60 bg-primary/10" /> паралел
                  </span>
                )}
              </div>
            )}
          </div>

          {!hasSelection ? (
            <p className="text-sm text-muted-foreground">Първо избери услуга.</p>
          ) : !performerId ? (
            <p className="text-sm text-muted-foreground">Избери изпълнител, за да видиш графика.</p>
          ) : loadingSlots ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Зареждам графика…
            </p>
          ) : dayClosed ? (
            <p className="rounded-lg border border-border bg-secondary/50 p-3 text-sm text-muted-foreground">
              Салонът е затворен на тази дата. Избери друг ден.
            </p>
          ) : slots.length === 0 ? (
            <p className="text-sm text-muted-foreground">Няма свободни часове за тази дата. Пробвай друг ден или се обади.</p>
          ) : (
            <>
              {slots.every((s) => s.status !== "free" && s.status !== "parallel") && (
                <p className="mb-2 rounded-lg border border-border bg-secondary/50 p-3 text-sm text-muted-foreground">
                  Всички часове за деня са заети или минали. Пробвай друг ден.
                </p>
              )}
              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
                {slots.map((s) => {
                  const selected = slot === s.start;
                  if (s.status === "free") {
                    return (
                      <button
                        key={s.start}
                        type="button"
                        onClick={() => setSlot(s.start)}
                        className={
                          "rounded-md border py-2 text-sm tabular-nums transition-colors " +
                          (selected ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground/50")
                        }
                      >
                        {slotLabel(s.start)}
                      </button>
                    );
                  }
                  if (s.status === "parallel") {
                    return (
                      <button
                        key={s.start}
                        type="button"
                        onClick={() => setSlot(s.start)}
                        title="Паралелен час — по време на престой на друг клиент"
                        className={
                          "flex flex-col items-center rounded-md border border-dashed py-1.5 text-sm tabular-nums transition-colors " +
                          (selected
                            ? "border-foreground bg-foreground text-background"
                            : "border-primary/60 bg-primary/5 hover:border-primary")
                        }
                      >
                        <span>{slotLabel(s.start)}</span>
                        <span className={"text-[9px] leading-none " + (selected ? "text-background/70" : "text-primary/80")}>
                          · паралел
                        </span>
                      </button>
                    );
                  }
                  return (
                    <span
                      key={s.start}
                      aria-disabled
                      title={s.status === "busy" ? "Заето" : "Минало"}
                      className={
                        "cursor-not-allowed rounded-md py-2 text-center text-sm tabular-nums " +
                        (s.status === "busy"
                          ? "bg-secondary text-muted-foreground line-through"
                          : "bg-muted/30 text-muted-foreground/55")
                      }
                    >
                      {slotLabel(s.start)}
                    </span>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="bf-name">Име</Label>
            <Input id="bf-name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} className="h-11" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bf-phone">Телефон</Label>
            <Input id="bf-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required minLength={5} className="h-11" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="bf-email">Имейл</Label>
          <Input id="bf-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11" />
        </div>

        <label className="flex items-start gap-3 rounded-lg border border-border p-4 text-sm">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 size-4" />
          <span className="text-foreground/80">
            Приемам условията: отказ само по телефон, минимум 5 часа предварително. При закъснение или неявяване се начислява 50% от стойността на услугата.
          </span>
        </label>

        {error && (
          <p role="alert" aria-live="assertive" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <Button
          type="submit"
          size="lg"
          disabled={submitting || !performerId || !slot || !consent}
          className="h-12 w-full rounded-full bg-foreground text-background hover:bg-primary"
        >
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Записване…
            </>
          ) : (
            "Запази час"
          )}
        </Button>
      </form>

      <Dialog open={!!lightbox} onOpenChange={(o) => !o && setLightbox(null)}>
        <DialogContent className="max-w-3xl" description="Галерия със снимки от работата на избрания изпълнител.">
          <DialogHeader>
            <DialogTitle>Работа на {lightbox?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid max-h-[70vh] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
            {lightbox?.portfolio.map((img, idx) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={idx}
                src={img.src}
                alt={img.alt}
                loading="lazy"
                className="aspect-square w-full rounded-lg object-cover"
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
