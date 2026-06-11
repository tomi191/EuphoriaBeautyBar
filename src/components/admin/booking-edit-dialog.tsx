"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateBooking } from "@/lib/actions/bookings";

export interface AdminEditServiceOpt {
  id: string;
  name: string;
  durationMin: number;
  category: string;
}

export interface AdminEditBookingData {
  id: string;
  serviceItemId: string | null;
  serviceName: string;
  clientName: string;
  clientPhone: string;
  dateStr: string; // YYYY-MM-DD Sofia
  timeStr: string; // HH:MM Sofia
  durationMin: number;
  notes: string;
}

const selectCls =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function BookingEditDialog({
  booking,
  services,
  trigger,
}: {
  booking: AdminEditBookingData;
  services: AdminEditServiceOpt[];
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
  const [notes, setNotes] = React.useState(booking.notes);

  // При отваряне ресет към текущите данни на часа.
  React.useEffect(() => {
    if (!open) return;
    setServiceId(booking.serviceItemId ?? "");
    setServiceName(booking.serviceName);
    setName(booking.clientName);
    setPhone(booking.clientPhone);
    setDate(booking.dateStr);
    setTime(booking.timeStr);
    setDuration(String(booking.durationMin));
    setNotes(booking.notes);
  }, [open, booking]);

  function onServiceChange(id: string) {
    setServiceId(id);
    const svc = services.find((s) => s.id === id);
    if (svc) {
      setServiceName(svc.name);
      setDuration(String(svc.durationMin));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await updateBooking(booking.id, {
        serviceItemId: serviceId || null,
        serviceName: serviceName.trim() || booking.serviceName,
        clientName: name.trim(),
        clientPhone: phone.trim(),
        dateStr: date,
        timeStr: time,
        durationMin: Number(duration),
        notes: notes.trim() || null,
      });
      if (res.ok) {
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
    <>
      <span className="contents" onClick={() => setOpen(true)}>
        {trigger}
      </span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
          description="Форма за редактиране на записан час — услуга, дата/час, продължителност и данни на клиента."
        >
          <DialogHeader>
            <DialogTitle>Редактирай часа</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bed-service">Услуга</Label>
              {services.length > 0 ? (
                <select id="bed-service" className={selectCls} value={serviceId} onChange={(e) => onServiceChange(e.target.value)}>
                  {!serviceId && <option value="">{serviceName || "Избери услуга…"}</option>}
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.category} — {s.name} ({s.durationMin} мин)
                    </option>
                  ))}
                </select>
              ) : (
                <Input id="bed-service" value={serviceName} onChange={(e) => setServiceName(e.target.value)} required />
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="bed-date">Дата</Label>
                <Input id="bed-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bed-time">Час</Label>
                <Input id="bed-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bed-duration">Минути</Label>
                <Input
                  id="bed-duration"
                  type="number"
                  min={5}
                  max={600}
                  step={5}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bed-name">Име на клиента</Label>
                <Input id="bed-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bed-phone">Телефон</Label>
                <Input id="bed-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bed-notes">Бележка (по избор)</Label>
              <Textarea id="bed-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Отказ
              </Button>
              <Button type="submit" disabled={submitting} className="bg-foreground text-background hover:bg-foreground/90">
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Запазване
                  </>
                ) : (
                  "Запази промените"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
