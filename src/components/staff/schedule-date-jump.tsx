"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarRange } from "lucide-react";
import { BookingCalendar } from "@/components/booking/booking-calendar";

/**
 * „Скок до дата" — отваря годишен календар над 7-дневните pills в графика, за да
 * може изпълнителят да види деня си за произволна дата (до 12 м. напред, 3 назад),
 * не само текущата седмица. Навигира чрез ?date= (server preglед по дата).
 */
export function ScheduleDateJump({ selected, todayKey }: { selected: string; todayKey: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-background px-3.5 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
      >
        <CalendarRange className="size-4" strokeWidth={1.8} /> Скок до дата
      </button>
      {open && (
        <div className="mt-2">
          <BookingCalendar
            value={selected}
            monthsBehind={3}
            monthsAhead={12}
            allowPast
            onChange={(k) => {
              setOpen(false);
              router.push(k === todayKey ? "/staff" : `/staff?date=${k}`);
            }}
          />
        </div>
      )}
    </div>
  );
}
