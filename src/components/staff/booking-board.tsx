"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { GripVertical, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { rescheduleMyBooking } from "@/lib/actions/staff-bookings";

export interface BoardBooking {
  id: string;
  startISO: string;
  endISO: string;
  timeLabel: string; // HH:MM в Sofia
  durationMin: number;
  serviceName: string;
  clientName: string | null;
  status: string;
}

export interface BoardDay {
  dateKey: string; // YYYY-MM-DD (Sofia)
  weekday: string;
  dayLabel: string;
  isToday: boolean;
  bookings: BoardBooking[];
}

const TZ = "Europe/Sofia";

/**
 * Отместване (минути) на Europe/Sofia спрямо UTC в даден момент — DST-safe,
 * огледало на sofiaOffsetMinutes от lib/booking/time (тук client-side).
 */
function sofiaOffsetMinutes(at: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p = Object.fromEntries(dtf.formatToParts(at).map((x) => [x.type, x.value])) as Record<string, string>;
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return Math.round((asUTC - at.getTime()) / 60000);
}

/** Локално стенно време (Sofia) → UTC ISO. dateStr=YYYY-MM-DD, timeStr=HH:MM */
function sofiaWallToUtcISO(dateStr: string, timeStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d, hh, mm, 0));
  const off = sofiaOffsetMinutes(guess);
  return new Date(guess.getTime() - off * 60000).toISOString();
}

const STATUS: Record<string, { label: string; cls: string }> = {
  confirmed: { label: "Потвърден", cls: "bg-mint/40 text-foreground" },
  arrived: { label: "Пристигна", cls: "bg-primary/20 text-foreground" },
  pending: { label: "Чакащ", cls: "bg-secondary text-muted-foreground" },
};

function durationLabel(min: number) {
  if (min < 60) return `${min} мин`;
  const h = Math.floor(min / 60);
  const mm = min % 60;
  return mm ? `${h} ч ${mm} мин` : `${h} ч`;
}

export function BookingBoard({ days: initialDays }: { days: BoardDay[] }) {
  const router = useRouter();
  const [days, setDays] = React.useState(initialDays);
  const [dragId, setDragId] = React.useState<string | null>(null);
  const [overKey, setOverKey] = React.useState<string | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  // Синхронизирай при нов server snapshot (router.refresh).
  React.useEffect(() => {
    setDays(initialDays);
  }, [initialDays]);

  function findBooking(id: string): { booking: BoardBooking; fromKey: string } | null {
    for (const day of days) {
      const booking = day.bookings.find((b) => b.id === id);
      if (booking) return { booking, fromKey: day.dateKey };
    }
    return null;
  }

  async function handleDrop(targetKey: string) {
    const id = dragId;
    setOverKey(null);
    setDragId(null);
    if (!id) return;

    const found = findBooking(id);
    if (!found || found.fromKey === targetKey) return;

    const { booking, fromKey } = found;
    const newStartISO = sofiaWallToUtcISO(targetKey, booking.timeLabel);

    // Optimistic: премести картата в целевия ден.
    const prev = days;
    const moved: BoardBooking = { ...booking, startISO: newStartISO };
    setDays((cur) =>
      cur.map((day) => {
        if (day.dateKey === fromKey) return { ...day, bookings: day.bookings.filter((b) => b.id !== id) };
        if (day.dateKey === targetKey) {
          const next = [...day.bookings, moved].sort((a, b) => a.startISO.localeCompare(b.startISO));
          return { ...day, bookings: next };
        }
        return day;
      }),
    );

    setBusyId(id);
    try {
      const res = await rescheduleMyBooking(id, newStartISO);
      if (res.ok) {
        toast.success("Часът е преместен.");
        router.refresh();
      } else {
        setDays(prev); // rollback
        toast.error(res.error);
      }
    } catch {
      setDays(prev); // rollback
      toast.error("Грешка при преместване.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-4">
      <div className="flex gap-3" style={{ minWidth: "min-content" }}>
        {days.map((day) => {
          const isOver = overKey === day.dateKey && dragId !== null;
          return (
            <div
              key={day.dateKey}
              onDragOver={(e) => {
                if (dragId === null) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (overKey !== day.dateKey) setOverKey(day.dateKey);
              }}
              onDragLeave={(e) => {
                // Само ако напускаме самата колона, не вътрешно дете.
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setOverKey((k) => (k === day.dateKey ? null : k));
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(day.dateKey);
              }}
              className={
                "flex w-[72vw] max-w-[260px] shrink-0 flex-col rounded-2xl border p-2.5 transition-colors sm:w-60 " +
                (isOver
                  ? "border-primary bg-mint/15"
                  : day.isToday
                    ? "border-primary/40 bg-cream/60"
                    : "border-border bg-background")
              }
            >
              <div className="mb-2 px-1">
                <p className="text-xs font-semibold capitalize text-foreground">
                  {day.weekday}
                  {day.isToday && <span className="ml-1.5 text-[10px] font-medium text-primary">днес</span>}
                </p>
                <p className="text-[11px] text-muted-foreground">{day.dayLabel}</p>
              </div>

              <div className="flex min-h-[64px] flex-col gap-2">
                {day.bookings.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border px-2 py-6 text-center text-[11px] text-muted-foreground">
                    {isOver ? "Пусни тук" : "Свободно"}
                  </p>
                ) : (
                  day.bookings.map((b) => {
                    const st = STATUS[b.status] ?? STATUS.pending;
                    const busy = busyId === b.id;
                    return (
                      <div
                        key={b.id}
                        draggable={!busy}
                        onDragStart={(e) => {
                          setDragId(b.id);
                          e.dataTransfer.effectAllowed = "move";
                          e.dataTransfer.setData("text/plain", b.id);
                        }}
                        onDragEnd={() => {
                          setDragId(null);
                          setOverKey(null);
                        }}
                        className={
                          "cursor-grab touch-none select-none rounded-xl border border-border bg-card p-2.5 shadow-sm transition-transform active:scale-[0.98] active:cursor-grabbing " +
                          (dragId === b.id ? "opacity-50" : "")
                        }
                      >
                        <div className="flex items-start gap-1.5">
                          <GripVertical className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="text-sm font-bold tabular-nums text-primary">{b.timeLabel}</span>
                              {busy ? (
                                <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                              ) : (
                                <span className={"shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium " + st.cls}>
                                  {st.label}
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 truncate text-[13px] font-semibold leading-tight">{b.serviceName}</p>
                            {b.clientName && <p className="truncate text-[11px] text-muted-foreground">{b.clientName}</p>}
                            <p className="mt-0.5 text-[10px] text-muted-foreground">{durationLabel(b.durationMin)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
