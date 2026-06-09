"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchMySlots, createMyBooking, type DayScheduleResult } from "@/lib/actions/staff-bookings";

export interface StaffServiceOpt {
  id: string;
  name: string;
  category: string;
  durationMin: number;
}

const selectCls = "h-12 w-full rounded-md border border-input bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function slotLabel(iso: string) {
  return new Intl.DateTimeFormat("bg-BG", { timeZone: "Europe/Sofia", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
}
function todayStr() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Sofia", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function StaffBookingForm({ services }: { services: StaffServiceOpt[] }) {
  const router = useRouter();
  const [serviceId, setServiceId] = React.useState("");
  const [date, setDate] = React.useState(todayStr());
  const [data, setData] = React.useState<DayScheduleResult>({ open: null, close: null, slots: [] });
  const [loading, setLoading] = React.useState(false);
  const [slot, setSlot] = React.useState("");
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const svc = services.find((s) => s.id === serviceId);

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
      const res = await createMyBooking({ serviceItemId: svc.id, serviceName: svc.name, startAt: slot, clientName: name, clientPhone: phone });
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
    <form onSubmit={submit} className="space-y-5">
      <div className="space-y-2">
        <Label>Услуга</Label>
        <select className={selectCls} value={serviceId} onChange={(e) => setServiceId(e.target.value)} required>
          <option value="">Избери услуга…</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>{s.category} — {s.name} ({s.durationMin} мин)</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label>Дата</Label>
        <Input type="date" value={date} min={todayStr()} onChange={(e) => setDate(e.target.value)} className="h-12" />
      </div>

      <div className="space-y-2">
        <Label>Час</Label>
        {!serviceId ? (
          <p className="text-sm text-muted-foreground">Първо избери услуга.</p>
        ) : loading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Зареждам…</p>
        ) : data.open === null ? (
          <p className="rounded-lg border border-border bg-secondary/50 p-3 text-sm text-muted-foreground">Не работиш на тази дата.</p>
        ) : data.slots.length === 0 ? (
          <p className="text-sm text-muted-foreground">Няма свободни часове.</p>
        ) : (
          <div className="grid grid-cols-4 gap-1.5">
            {data.slots.map((s) => {
              if (s.status === "free") {
                return (
                  <button key={s.start} type="button" onClick={() => setSlot(s.start)}
                    className={"rounded-md border py-2 text-sm tabular-nums transition-colors " + (slot === s.start ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground/50")}>
                    {slotLabel(s.start)}
                  </button>
                );
              }
              return (
                <span key={s.start} className={"cursor-not-allowed rounded-md py-2 text-center text-sm tabular-nums " + (s.status === "busy" ? "bg-secondary text-muted-foreground/70 line-through" : "bg-muted/30 text-muted-foreground/40")}>
                  {slotLabel(s.start)}
                </span>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Име на клиента</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} className="h-12" />
        </div>
        <div className="space-y-2">
          <Label>Телефон</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} required minLength={5} className="h-12" />
        </div>
      </div>

      <Button type="submit" disabled={submitting || !slot} className="h-12 w-full rounded-full bg-foreground text-base text-background hover:bg-primary">
        {submitting ? <><Loader2 className="size-4 animate-spin" /> Записване</> : <><CheckCircle2 className="size-4" /> Запиши часа</>}
      </Button>
    </form>
  );
}
