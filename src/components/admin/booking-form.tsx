"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createBooking, fetchSlots } from "@/lib/actions/bookings";
import type { DaySlot } from "@/lib/booking/slots";
import { BookingCalendar } from "@/components/booking/booking-calendar";

export interface ResourceOpt {
  id: string;
  name: string;
}
export interface ServiceOpt {
  id: string;
  name: string;
  durationMin: number;
  bufferMin: number;
  category: string;
}

const selectCls =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function slotLabel(iso: string) {
  return new Intl.DateTimeFormat("bg-BG", {
    timeZone: "Europe/Sofia",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function BookingForm({
  trigger,
  resources,
  services,
  defaultResourceId,
  defaultDate,
}: {
  trigger: React.ReactNode;
  resources: ResourceOpt[];
  services: ServiceOpt[];
  defaultResourceId: string;
  defaultDate: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const [resourceId, setResourceId] = React.useState(defaultResourceId);
  const [serviceId, setServiceId] = React.useState("");
  const [date, setDate] = React.useState(defaultDate);
  const [slots, setSlots] = React.useState<DaySlot[]>([]);
  const [dayClosed, setDayClosed] = React.useState(false);
  const [slot, setSlot] = React.useState("");
  const [loadingSlots, setLoadingSlots] = React.useState(false);

  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [notes, setNotes] = React.useState("");

  const svc = services.find((s) => s.id === serviceId);

  React.useEffect(() => {
    if (!resourceId || !serviceId || !date) {
      setSlots([]);
      setDayClosed(false);
      return;
    }
    let cancelled = false;
    setLoadingSlots(true);
    setSlot("");
    fetchSlots(resourceId, serviceId, date)
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
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });
    return () => {
      cancelled = true;
    };
  }, [resourceId, serviceId, date]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!svc || !slot) {
      toast.error("Избери услуга и свободен час.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await createBooking({
        resourceId,
        serviceItemId: svc.id,
        serviceName: svc.name,
        durationMin: svc.durationMin,
        bufferMin: svc.bufferMin,
        startAt: slot,
        clientName: name,
        clientPhone: phone,
        clientEmail: email || null,
        notes: notes || null,
        source: "phone",
      });
      if (res.ok) {
        toast.success("Часът е записан.");
        setOpen(false);
        setServiceId("");
        setSlot("");
        setName("");
        setPhone("");
        setEmail("");
        setNotes("");
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error("Грешка при записване.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <span className="contents" onClick={() => setOpen(true)}>
        {trigger}
      </span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" description="Форма за ръчно записване на час — изпълнител, услуга, дата, свободен час и данни на клиента.">
        <DialogHeader>
          <DialogTitle>Нов час</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Изпълнител</Label>
            <select className={selectCls} value={resourceId} onChange={(e) => setResourceId(e.target.value)}>
              {resources.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Дата</Label>
            <BookingCalendar value={date} onChange={setDate} />
          </div>

          <div className="space-y-2">
            <Label>Услуга</Label>
            <select className={selectCls} value={serviceId} onChange={(e) => setServiceId(e.target.value)} required>
              <option value="">Избери услуга…</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.category} — {s.name} ({s.durationMin} мин)
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Час</Label>
              {serviceId && !loadingSlots && !dayClosed && slots.length > 0 && (
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="size-2.5 rounded-full border border-foreground/40 bg-background" /> свободно
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="size-2.5 rounded-full bg-secondary" /> заето
                  </span>
                </div>
              )}
            </div>
            {!serviceId ? (
              <p className="text-sm text-muted-foreground">Първо избери услуга и дата.</p>
            ) : loadingSlots ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Зареждам графика…
              </p>
            ) : dayClosed ? (
              <p className="rounded-lg border border-border bg-secondary/50 p-3 text-sm text-muted-foreground">
                Салонът е затворен на тази дата (почивен ден).
              </p>
            ) : slots.length === 0 ? (
              <p className="text-sm text-muted-foreground">За тази услуга няма как да се запази час на тази дата.</p>
            ) : (
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
                          "rounded-md border py-1.5 text-sm tabular-nums transition-colors " +
                          (selected ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground/50")
                        }
                      >
                        {slotLabel(s.start)}
                      </button>
                    );
                  }
                  return (
                    <span
                      key={s.start}
                      aria-disabled
                      title={s.status === "busy" ? "Заето" : "Минало"}
                      className={
                        "cursor-not-allowed rounded-md py-1.5 text-center text-sm tabular-nums " +
                        (s.status === "busy"
                          ? "bg-secondary text-muted-foreground/70 line-through"
                          : "bg-muted/30 text-muted-foreground/40")
                      }
                    >
                      {slotLabel(s.start)}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Име на клиента</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
            </div>
            <div className="space-y-2">
              <Label>Телефон</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} required minLength={5} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Имейл (по избор)</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Бележка (по избор)</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Отказ
            </Button>
            <Button type="submit" disabled={submitting || !slot} className="bg-foreground text-background hover:bg-foreground/90">
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Записване
                </>
              ) : (
                "Запиши час"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      </Dialog>
    </>
  );
}
