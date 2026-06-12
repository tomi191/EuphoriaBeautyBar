"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, Contact, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { editMyBooking } from "@/lib/actions/staff-bookings";
import { contactPickerSupported, pickContact } from "@/lib/contact-picker";

export interface EditServiceOpt {
  id: string;
  name: string;
  category: string;
  durationMin: number;
  /** Буфер след услугата — влиза в резервирания блок (виж onServiceChange). */
  bufferMin: number;
}

export interface EditBookingData {
  id: string;
  serviceItemId: string | null;
  serviceName: string;
  clientName: string;
  clientPhone: string;
  dateStr: string; // YYYY-MM-DD Sofia
  timeStr: string; // HH:MM Sofia
  durationMin: number;
  activeMin: number;
  processingMin: number;
  notes: string;
}

function uniq(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) if (!seen.has(v)) { seen.add(v); out.push(v); }
  return out;
}

export function BookingEditSheet({
  booking,
  services,
  trigger,
}: {
  booking: EditBookingData;
  services: EditServiceOpt[];
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const [serviceId, setServiceId] = React.useState(booking.serviceItemId ?? "");
  const [serviceName, setServiceName] = React.useState(booking.serviceName);
  const [name, setName] = React.useState(booking.clientName);
  const [phone, setPhone] = React.useState(booking.clientPhone);
  const [date, setDate] = React.useState(booking.dateStr);
  const [time, setTime] = React.useState(booking.timeStr);
  const [duration, setDuration] = React.useState(String(booking.durationMin));
  const [activeMin, setActiveMin] = React.useState(String(booking.activeMin));
  const [processingMin, setProcessingMin] = React.useState(String(booking.processingMin));
  const [notes, setNotes] = React.useState(booking.notes);

  const [canPick, setCanPick] = React.useState(false);
  React.useEffect(() => setCanPick(contactPickerSupported()), []);

  // При отваряне ресет към текущите данни на часа (формата може да е стояла отворена след предишен edit).
  React.useEffect(() => {
    if (!open) return;
    setServiceId(booking.serviceItemId ?? "");
    setServiceName(booking.serviceName);
    setName(booking.clientName);
    setPhone(booking.clientPhone);
    setDate(booking.dateStr);
    setTime(booking.timeStr);
    setDuration(String(booking.durationMin));
    setActiveMin(String(booking.activeMin));
    setProcessingMin(String(booking.processingMin));
    setNotes(booking.notes);
  }, [open, booking]);

  const categories = React.useMemo(() => uniq(services.map((s) => s.category)), [services]);

  function onServiceChange(id: string) {
    setServiceId(id);
    const svc = services.find((s) => s.id === id);
    if (svc) {
      setServiceName(svc.name);
      // Резервираният блок = услуга + буфер (както при създаване). Полето „Минути"
      // е общата продължителност, която сървърът пише директно като endAt.
      setDuration(String(svc.durationMin + svc.bufferMin));
    }
  }

  async function onPickContact() {
    const c = await pickContact();
    if (!c) return;
    if (c.name) setName(c.name);
    if (c.phone) setPhone(c.phone);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      toast.error("Няма връзка — промяната не е запазена. Опитай, когато си онлайн.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await editMyBooking(booking.id, {
        serviceItemId: serviceId || null,
        serviceName: serviceName.trim() || booking.serviceName,
        clientName: name.trim(),
        clientPhone: phone.trim(),
        dateStr: date,
        timeStr: time,
        durationMin: Number(duration),
        activeMin: Number(activeMin),
        processingMin: Number(processingMin),
        notes: notes.trim() || null,
      });
      if (res.ok) {
        if (typeof navigator !== "undefined") navigator.vibrate?.(10);
        toast.success("Часът е обновен.");
        router.refresh();
        setOpen(false);
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error("Грешка при запазване.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <span className="contents" onClick={() => setOpen(true)}>
        {trigger}
      </span>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader className="px-0">
          <SheetTitle>Редактирай часа</SheetTitle>
          <SheetDescription>Услуга, клиент, дата/час и продължителност на този час.</SheetDescription>
        </SheetHeader>

        <form onSubmit={submit} className="space-y-4">
          {/* Услуга */}
          <div className="space-y-1.5">
            <Label htmlFor="bes-service">Услуга</Label>
            {services.length > 0 ? (
              <Select value={serviceId} onValueChange={onServiceChange}>
                <SelectTrigger id="bes-service" className="h-11 w-full">
                  <SelectValue placeholder="Избери услуга…">{serviceName}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectGroup key={cat}>
                      <SelectLabel>{cat}</SelectLabel>
                      {services
                        .filter((s) => s.category === cat)
                        .map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name} ({s.durationMin} мин)
                          </SelectItem>
                        ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="bes-service"
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                className="h-11"
                required
              />
            )}
          </div>

          {/* Клиент */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bes-name">Име</Label>
              <Input id="bes-name" value={name} onChange={(e) => setName(e.target.value)} className="h-11 text-base" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bes-phone">Телефон</Label>
              <Input id="bes-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-11 text-base" />
            </div>
          </div>
          {canPick && (
            <Button
              type="button"
              variant="outline"
              onClick={onPickContact}
              className="h-10 w-full rounded-full text-sm"
            >
              <Contact className="size-4" /> Избери от контакти
            </Button>
          )}

          {/* Дата / час / продължителност */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bes-date">Дата</Label>
              <Input id="bes-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bes-time">Час</Label>
              <Input id="bes-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-11" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bes-duration">Минути</Label>
              <Input
                id="bes-duration"
                type="number"
                min={5}
                max={600}
                step={5}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="h-11"
                required
              />
            </div>
          </div>

          {/* Активни минути / престой — за паралелни часове (дълга/къса коса) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bes-active">Активни минути</Label>
              <Input
                id="bes-active"
                type="number"
                min={0}
                max={600}
                step={5}
                value={activeMin}
                onChange={(e) => setActiveMin(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bes-processing">Минути престой</Label>
              <Input
                id="bes-processing"
                type="number"
                min={0}
                max={600}
                step={5}
                value={processingMin}
                onChange={(e) => setProcessingMin(e.target.value)}
                className="h-11"
              />
            </div>
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Престоят отваря паралелен час; настрой според клиента (дълга/къса коса). 0 = няма престой.
          </p>

          {/* Бележки */}
          <div className="space-y-1.5">
            <Label htmlFor="bes-notes" className="flex items-center gap-1.5">
              Бележка <span className="font-normal text-muted-foreground">(по избор)</span>
            </Label>
            <Textarea id="bes-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="text-base" />
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Lock className="size-3" /> Вижда се само от теб, не от клиента.
            </p>
          </div>

          <Button type="submit" disabled={submitting} className="h-12 w-full rounded-full bg-foreground text-base text-background hover:bg-primary">
            {submitting ? <><Loader2 className="size-4 animate-spin" /> Запазване</> : <><CheckCircle2 className="size-5" /> Запази промените</>}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
