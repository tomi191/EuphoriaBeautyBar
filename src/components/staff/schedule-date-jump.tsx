"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarRange } from "lucide-react";
import { BookingCalendar } from "@/components/booking/booking-calendar";

/**
 * „Скок до дата" — първата плочка в реда с 7-дневните pills (иконата календар); отваря годишен
 * календар под реда, за да може изпълнителят да види деня си за произволна дата (до 12 м. напред,
 * 3 назад), не само текущата седмица. Навигира чрез ?date= (server preglед по дата).
 * `children` са плочките на дните.
 */
export function ScheduleDateJump({
  selected,
  todayKey,
  children,
}: {
  selected: string;
  todayKey: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  return (
    <div className="mb-5">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label="Скок до дата"
          className="flex w-12 shrink-0 items-center justify-center rounded-2xl border border-border bg-background text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
        >
          <CalendarRange className="size-5" strokeWidth={1.8} />
        </button>
        {children}
      </div>
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
