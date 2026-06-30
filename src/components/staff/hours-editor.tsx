"use client";

import * as React from "react";
import { Loader2, Plus, Trash2, CalendarOff } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setMyWorkingHours, addMyTimeOff, deleteMyTimeOff } from "@/lib/actions/resource-hours";

export interface DayHours {
  weekday: number;
  openTime: string;
  closeTime: string;
  closed: boolean;
  custom: boolean;
}
export interface TimeOffItem {
  id: string;
  startAt: string;
  endAt: string;
  reason: string | null;
}

const DAY_LABEL: Record<number, string> = {
  1: "Понеделник", 2: "Вторник", 3: "Сряда", 4: "Четвъртък", 5: "Петък", 6: "Събота", 0: "Неделя",
};

const dtFmt = new Intl.DateTimeFormat("bg-BG", { timeZone: "Europe/Sofia", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });

export function HoursEditor({ days, timeOff }: { days: DayHours[]; timeOff: TimeOffItem[] }) {
  const [rows, setRows] = React.useState(days);
  const [savingHours, setSavingHours] = React.useState(false);
  const [offs, setOffs] = React.useState(timeOff);

  function patch(weekday: number, p: Partial<DayHours>) {
    // Маркирай деня като custom → запазва се само той (без да заключва салонния
    // fallback за неотметнатите дни).
    setRows((prev) => prev.map((r) => (r.weekday === weekday ? { ...r, ...p, custom: true } : r)));
  }

  async function saveHours() {
    // Работен ден трябва да има начало преди край, иначе getDaySlots тихо връща 0 слота.
    const bad = rows.find((r) => !r.closed && !(r.openTime && r.closeTime && r.openTime < r.closeTime));
    if (bad) {
      toast.error(`${DAY_LABEL[bad.weekday]}: краят трябва да е след началото.`);
      return;
    }
    setSavingHours(true);
    try {
      // Само custom (редактираните/собствени) дни → останалите остават на салонното време.
      const toSave = rows.filter((r) => r.custom);
      await Promise.all(
        toSave.map((r) =>
          setMyWorkingHours({ weekday: r.weekday, openTime: r.closed ? null : r.openTime, closeTime: r.closed ? null : r.closeTime, closed: r.closed }),
        ),
      );
      toast.success("Работното време е запазено.");
    } catch {
      toast.error("Грешка при запазване.");
    } finally {
      setSavingHours(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Работно време по дни */}
      <section>
        <h2 className="mb-2 text-sm font-semibold">Работно време</h2>
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-background">
          {rows.map((r) => (
            <div key={r.weekday} className="flex items-center gap-3 p-3.5">
              <div className="w-24 shrink-0">
                <p className="text-sm font-medium leading-tight">{DAY_LABEL[r.weekday]}</p>
                <p className="text-xs text-muted-foreground">{r.closed ? "почивен" : "работен"}</p>
              </div>
              {r.closed ? (
                <div className="flex-1 text-sm text-muted-foreground">—</div>
              ) : (
                <div className="flex flex-1 items-center gap-1.5">
                  <Input type="time" value={r.openTime} onChange={(e) => patch(r.weekday, { openTime: e.target.value })} className="h-10 px-2 text-base" />
                  <span className="text-muted-foreground">–</span>
                  <Input type="time" value={r.closeTime} onChange={(e) => patch(r.weekday, { closeTime: e.target.value })} className="h-10 px-2 text-base" />
                </div>
              )}
              <Switch checked={!r.closed} onCheckedChange={(v) => patch(r.weekday, { closed: !v })} />
            </div>
          ))}
        </div>
        <Button onClick={saveHours} disabled={savingHours} className="mt-3 h-11 w-full rounded-full bg-foreground text-background hover:bg-primary">
          {savingHours ? <><Loader2 className="size-4 animate-spin" /> Запазване</> : "Запази работното време"}
        </Button>
      </section>

      {/* Почивки / отпуск */}
      <TimeOffSection offs={offs} setOffs={setOffs} />
    </div>
  );
}

function TimeOffSection({ offs, setOffs }: { offs: TimeOffItem[]; setOffs: React.Dispatch<React.SetStateAction<TimeOffItem[]>> }) {
  const [open, setOpen] = React.useState(false);
  const [date, setDate] = React.useState("");
  const [from, setFrom] = React.useState("09:00");
  const [to, setTo] = React.useState("18:00");
  const [reason, setReason] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState<string | null>(null);

  async function add() {
    if (!date) {
      toast.error("Избери дата.");
      return;
    }
    setSaving(true);
    try {
      // Пращаме сурово Sofia-време; сървърът смята UTC (DST-safe), не браузърът.
      const res = await addMyTimeOff({ dateStr: date, fromTime: from, toTime: to, reason: reason || null });
      if (res.ok) {
        toast.success("Почивката е добавена.");
        setOpen(false);
        setDate("");
        setReason("");
        setOffs((prev) => [...prev, res.item].sort((a, b) => a.startAt.localeCompare(b.startAt)));
      } else {
        toast.error(res.error ?? "Грешка.");
      }
    } catch {
      toast.error("Грешка при добавяне.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setDeleting(id);
    const prev = offs;
    setOffs((p) => p.filter((o) => o.id !== id));
    try {
      const res = await deleteMyTimeOff(id);
      if (!res.ok) {
        setOffs(prev);
        toast.error(res.error ?? "Грешка.");
      }
    } catch {
      setOffs(prev);
      toast.error("Грешка.");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Почивки и отпуск</h2>
        <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)} className="rounded-full">
          <Plus className="size-3.5" /> Добави
        </Button>
      </div>

      {open && (
        <div className="mb-3 space-y-3 rounded-2xl border border-border bg-background p-4">
          <div className="space-y-1.5">
            <Label>Дата</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>От</Label>
              <Input type="time" value={from} onChange={(e) => setFrom(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label>До</Label>
              <Input type="time" value={to} onChange={(e) => setTo(e.target.value)} className="h-11" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Причина (опц.)</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="напр. обяд, отпуск" className="h-11" />
          </div>
          <Button onClick={add} disabled={saving} className="h-11 w-full rounded-full bg-foreground text-background hover:bg-primary">
            {saving ? <><Loader2 className="size-4 animate-spin" /> Добавяне</> : "Добави почивка"}
          </Button>
        </div>
      )}

      {offs.length === 0 ? (
        <div className="rounded-2xl border border-border bg-background p-6 text-center text-sm text-muted-foreground">
          <CalendarOff className="mx-auto size-6" strokeWidth={1.5} />
          <p className="mt-2">Няма планирани почивки.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {offs.map((o) => (
            <div key={o.id} className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {dtFmt.format(new Date(o.startAt))} – {new Intl.DateTimeFormat("bg-BG", { timeZone: "Europe/Sofia", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(o.endAt))}
                </p>
                {o.reason && <p className="text-xs text-muted-foreground">{o.reason}</p>}
              </div>
              <button
                onClick={() => remove(o.id)}
                disabled={deleting === o.id}
                aria-label="Изтрий"
                className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                {deleting === o.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
