"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { sofiaDateStr } from "@/lib/booking/time";

/**
 * Споделен inline месечен календар за избор/навигация по дата (YYYY-MM-DD,
 * Sofia-локална). Заменя 7-дневните ленти — позволява запис/преглед за цялата
 * година напред (и назад, ако allowPast).
 *
 * Date ключовете се строят с чиста y/m/d аритметика (без Date→ISO конверсия) →
 * няма timezone off-by-one. „Днес" е по Europe/Sofia; „YYYY-MM-DD" низовете се
 * сравняват лексикографски = хронологично.
 */

const WEEKDAYS = ["пн", "вт", "ср", "чт", "пт", "сб", "нд"]; // седмицата започва от понеделник
const MONTHS = [
  "Януари", "Февруари", "Март", "Април", "Май", "Юни",
  "Юли", "Август", "Септември", "Октомври", "Ноември", "Декември",
];

const pad = (n: number) => String(n).padStart(2, "0");
const dayKey = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`; // m е 0-базиран
const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
// Индекс на 1-во число с понеделник=0 (getDay: 0=неделя..6=събота).
const firstWeekdayMon = (y: number, m: number) => (new Date(y, m, 1).getDay() + 6) % 7;

export interface BookingCalendarProps {
  /** Избрана дата YYYY-MM-DD (или ""). */
  value: string;
  onChange: (date: string) => void;
  /** Изрична най-ранна избираема дата YYYY-MM-DD (override). */
  minDate?: string;
  /** Колко месеца напред е навигируемо. По подразбиране 12. */
  monthsAhead?: number;
  /** Колко месеца назад е навигируемо. По подразбиране 0 (само напред — за запис). */
  monthsBehind?: number;
  /** Позволи избор на минали дни (за преглед на график). По подразбиране false. */
  allowPast?: boolean;
  className?: string;
}

export function BookingCalendar({
  value,
  onChange,
  minDate,
  monthsAhead = 12,
  monthsBehind = 0,
  allowPast = false,
  className,
}: BookingCalendarProps) {
  // „Днес" по Sofia — изчислено веднъж на mount (стабилно при re-render).
  const [today] = React.useState(() => sofiaDateStr(new Date()));
  const [ty, tm1] = today.split("-").map(Number);
  const todayAbs = ty * 12 + (tm1 - 1); // месеци като абсолютно число

  const minNavAbs = todayAbs - monthsBehind; // най-ранен навигируем месец
  const maxNavAbs = todayAbs + monthsAhead; // най-късен навигируем месец

  // Най-ранна ИЗБИРАЕМА дата: изричен minDate, иначе днес (или началото на
  // навигируемия диапазон, ако се разрешава минало).
  const floor =
    minDate ?? (allowPast ? `${Math.floor(minNavAbs / 12)}-${pad((minNavAbs % 12) + 1)}-01` : today);

  // Показан месец — от избраната дата (или днес), clamp-нат в навигируемия диапазон.
  const [view, setView] = React.useState(() => {
    const [y, m] = (value || today).split("-").map(Number);
    const abs = Math.min(maxNavAbs, Math.max(minNavAbs, y * 12 + (m - 1)));
    return { y: Math.floor(abs / 12), m: abs % 12 };
  });

  const viewAbs = view.y * 12 + view.m;
  const canPrev = viewAbs > minNavAbs;
  const canNext = viewAbs < maxNavAbs;

  function shift(delta: number) {
    const abs = Math.min(maxNavAbs, Math.max(minNavAbs, viewAbs + delta));
    setView({ y: Math.floor(abs / 12), m: abs % 12 });
  }

  const lead = firstWeekdayMon(view.y, view.m);
  const total = daysInMonth(view.y, view.m);
  const cells: (number | null)[] = [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: total }, (_, i) => i + 1),
  ];

  return (
    <div className={"rounded-2xl border border-border bg-background p-3 " + (className ?? "")}>
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => shift(-1)}
          disabled={!canPrev}
          aria-label="Предишен месец"
          className="grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronLeft className="size-5" />
        </button>
        <span className="text-sm font-semibold">
          {MONTHS[view.m]} {view.y}
        </span>
        <button
          type="button"
          onClick={() => shift(1)}
          disabled={!canNext}
          aria-label="Следващ месец"
          className="grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {WEEKDAYS.map((w) => (
          <span key={w} className="py-1 text-center text-[11px] font-medium text-muted-foreground">
            {w}
          </span>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <span key={"e" + i} aria-hidden />;
          const k = dayKey(view.y, view.m, d);
          const disabled = k < floor;
          const selected = k === value;
          const isToday = k === today;
          const weekend = i % 7 >= 5;
          return (
            <button
              key={k}
              type="button"
              disabled={disabled}
              onClick={() => onChange(k)}
              aria-label={k}
              aria-pressed={selected}
              className={
                "relative grid h-10 place-items-center rounded-xl text-sm tabular-nums transition-colors " +
                (selected
                  ? "bg-foreground font-bold text-background"
                  : disabled
                    ? "text-muted-foreground/30"
                    : weekend
                      ? "text-muted-foreground hover:bg-secondary active:scale-95"
                      : "text-foreground hover:bg-secondary active:scale-95")
              }
            >
              {d}
              {isToday && !selected && <span className="absolute bottom-1 size-1 rounded-full bg-primary" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
