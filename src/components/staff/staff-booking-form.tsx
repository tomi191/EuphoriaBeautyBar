"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, Check, Lock, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fetchMySlots, createMyBooking, type DayScheduleResult } from "@/lib/actions/staff-bookings";
import { BookingCalendar } from "@/components/booking/booking-calendar";

export interface StaffServiceOpt {
  id: string;
  name: string;
  category: string;
  durationMin: number;
}

function slotLabel(iso: string) {
  return new Intl.DateTimeFormat("bg-BG", { timeZone: "Europe/Sofia", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
}
function todayStr() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Sofia", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function uniq(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) if (!seen.has(v)) { seen.add(v); out.push(v); }
  return out;
}

export function StaffBookingForm({ services, closedDates }: { services: StaffServiceOpt[]; closedDates?: string[] }) {
  const router = useRouter();
  const [serviceId, setServiceId] = React.useState("");
  const [date, setDate] = React.useState(todayStr());
  const [data, setData] = React.useState<DayScheduleResult>({ open: null, close: null, slots: [] });
  const [loading, setLoading] = React.useState(false);
  const [slot, setSlot] = React.useState("");
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const svc = services.find((s) => s.id === serviceId);
  const categories = React.useMemo(() => uniq(services.map((s) => s.category)), [services]);
  const [activeCat, setActiveCat] = React.useState(categories[0] ?? "");
  const [query, setQuery] = React.useState("");
  /** true = списъкът е разгънат за смяна на вече избрана услуга. */
  const [picking, setPicking] = React.useState(false);
  const q = query.trim().toLowerCase();
  const shown = services.filter((s) => s.category === activeCat && (q === "" || s.name.toLowerCase().includes(q)));

  React.useEffect(() => {
    if (!serviceId || !date) {
      setData({ open: null, close: null, slots: [] });
      return;
    }
    let cancelled = false;
    setLoading(true);
    setSlot("");
    fetchMySlots(serviceId, date)
      .then((r) => !cancelled && setData(r))
      .catch(() => !cancelled && setData({ open: null, close: null, slots: [] }))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [serviceId, date]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!svc || !slot) {
      toast.error("Избери услуга и час.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await createMyBooking({
        serviceItemId: svc.id,
        serviceName: svc.name,
        startAt: slot,
        clientName: name,
        clientPhone: phone,
        notes: notes.trim() || null,
      });
      if (res.ok) {
        toast.success("Часът е записан.");
        router.push("/staff");
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error("Грешка при записване.");
    } finally {
      setSubmitting(false);
    }
  }

  if (services.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-background p-6 text-center text-sm text-muted-foreground">
        Първо отметни услугите, които предлагаш, в раздел „Услуги".
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* Услуга — карти, не dropdown; при избрана услуга списъкът се свива до 1 ред */}
      <section>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Услуга</p>
        {svc && !picking ? (
          <div className="flex items-center gap-2.5 rounded-xl border border-foreground bg-secondary px-3 py-2">
            <span className="grid size-5 shrink-0 place-items-center rounded-full border border-foreground bg-foreground text-background">
              <Check className="size-3" strokeWidth={3} />
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold leading-tight">{svc.name}</span>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{svc.durationMin} мин</span>
            <button
              type="button"
              onClick={() => setPicking(true)}
              className="shrink-0 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold transition-colors hover:border-foreground/40"
            >
              Промени
            </button>
          </div>
        ) : (
          <>
            {categories.length > 1 && (
              <div className="mb-3 flex gap-1.5 rounded-2xl bg-cream p-1.5">
                {categories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setActiveCat(c)}
                    className={
                      "flex-1 rounded-xl py-2 text-sm font-semibold transition-colors " +
                      (c === activeCat ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")
                    }
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
            <div className="relative mb-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                placeholder="Търси услуга…"
                aria-label="Търси услуга"
                className="h-11 rounded-xl pl-9 pr-10"
              />
              {query !== "" && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Изчисти търсенето"
                  className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center text-muted-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
            <div className="space-y-1.5">
              {shown.map((s) => {
                const selected = serviceId === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setServiceId(s.id);
                      setPicking(false);
                      setQuery("");
                    }}
                    className={
                      "flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-all active:scale-[0.98] " +
                      (selected ? "border-foreground bg-secondary" : "border-border bg-background hover:border-foreground/40")
                    }
                  >
                    <span
                      className={
                        "grid size-5 shrink-0 place-items-center rounded-full border " +
                        (selected ? "border-foreground bg-foreground text-background" : "border-input")
                      }
                    >
                      {selected && <Check className="size-3" strokeWidth={3} />}
                    </span>
                    <span className="min-w-0 flex-1 text-sm font-semibold leading-tight">{s.name}</span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{s.durationMin} мин</span>
                  </button>
                );
              })}
              {shown.length === 0 && (
                <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                  Няма услуга по това търсене.
                </p>
              )}
            </div>
          </>
        )}
      </section>

      {/* Дата — пълногодишен календар */}
      <section>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Дата</p>
        <BookingCalendar value={date} onChange={setDate} disabledDates={closedDates} />
      </section>

      {/* Час */}
      <section>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Час</p>
        {!serviceId ? (
          <p className="rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">Първо избери услуга.</p>
        ) : loading ? (
          <p className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-background p-4 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Зареждам графика…
          </p>
        ) : data.open === null ? (
          <p className="rounded-2xl border border-border bg-secondary/50 p-4 text-center text-sm text-muted-foreground">Не работиш на тази дата.</p>
        ) : data.slots.length === 0 ? (
          <p className="rounded-2xl border border-border bg-background p-4 text-center text-sm text-muted-foreground">Няма свободни часове.</p>
        ) : (
          <div className="grid grid-cols-4 gap-1.5">
            {data.slots.map((s) => {
              if (s.status === "free") {
                return (
                  <button key={s.start} type="button" onClick={() => setSlot(s.start)}
                    className={"rounded-xl border py-2.5 text-sm font-medium tabular-nums transition-all active:scale-[0.98] " + (slot === s.start ? "border-foreground bg-foreground text-background" : "border-border bg-background hover:border-foreground/50")}>
                    {slotLabel(s.start)}
                  </button>
                );
              }
              return (
                <span key={s.start} className={"cursor-not-allowed rounded-xl py-2.5 text-center text-sm tabular-nums " + (s.status === "busy" ? "bg-secondary text-muted-foreground line-through" : "bg-muted/30 text-muted-foreground/55")}>
                  {slotLabel(s.start)}
                </span>
              );
            })}
          </div>
        )}
      </section>

      {/* Клиент */}
      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Клиент</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="sbf-name">Име</Label>
            <Input id="sbf-name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} className="h-12 text-base" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sbf-phone">Телефон</Label>
            <Input id="sbf-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required minLength={5} className="h-12 text-base" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sbf-notes" className="flex items-center gap-1.5">
            Допълнителна информация <span className="font-normal text-muted-foreground">(по избор)</span>
          </Label>
          <Textarea
            id="sbf-notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="напр. желан нюанс, алергии, предпочитания…"
            className="text-base"
          />
          <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Lock className="size-3" /> Вижда се само от теб, не от клиента.
          </p>
        </div>
      </section>

      <Button type="submit" disabled={submitting || !slot} className="h-13 w-full rounded-full bg-foreground text-base text-background hover:bg-primary">
        {submitting ? <><Loader2 className="size-4 animate-spin" /> Записване</> : <><CheckCircle2 className="size-5" /> Запиши часа</>}
      </Button>
    </form>
  );
}
