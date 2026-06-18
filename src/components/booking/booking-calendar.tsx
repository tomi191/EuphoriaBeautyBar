"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { sofiaDateStr } from "@/lib/booking/time";

/**
 * Споделен inline месечен календар за избор на дата (YYYY-MM-DD, Sofia-локална).
 * Заменя 7-дневните ленти — позволява запис за цялата година напред.
 *
 * Datе ключовете се строят с чиста y/m/d аритметика (без Date→ISO конверсия) →
 * няма timezone off-by-one. „Днес" е по Europe/Sofia; „YYYY-MM-DD" низовете се
 * сравняват лексикографски = хронологично, затова past/selected/today са прости
 * string сравнения.
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
  /** Най-ранна избираема дата YYYY-MM-DD; по-ранните дни са disabled. По подразбиране днес (Sofia). */
  minDate?: string;
  /** Колко месеца напред е навигируемо. По подразбиране 12. */
  monthsAhead?: number;
  className?: string;
}

export function BookingCalendar({ value, onChange, minDate, monthsAhead = 12, className }: BookingCalendarProps) {
  // „Днес" по Sofia — изчислено веднъж на mount (стабилно при re-render).
  const [today] = React.useState(() => sofiaDateStr(new Date()));
  const min = minDate ?? today;

  const [minY, minM1] = min.split("-").map(Number);
  const minAbs = minY * 12 + (minM1 - 1); // месеци като абсолютно число
  const maxAbs = minAbs + monthsAhead;

  // Показан месец — от избраната дата (ако е валидна), иначе от min.
  const [view, setView] = React.useState(() => {
    const src = value && value >= min ? value : min;
    const [y, m] = src.split("-").map(Number);
    return { y, m: m - 1 };
  });

  const viewAbs = view.y * 12 + view.m;
  const canPrev = viewAbs > minAbs;
  const canNext = viewAbs < maxAbs;

  function shift(delta: number) {
    const abs = Math.min(maxAbs, Math.max(minAbs, viewAbs + delta));
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
          const disabled = k < min;
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
