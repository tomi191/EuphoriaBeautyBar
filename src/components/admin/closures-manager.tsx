"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { BookingCalendar } from "@/components/booking/booking-calendar";
import { Button } from "@/components/ui/button";
import { FieldHint } from "@/components/ui/field-hint";
import { FIELD_HINTS } from "@/lib/data/field-hints";
import { addClosedDate, removeClosedDate } from "@/lib/actions/closures";

const fmt = new Intl.DateTimeFormat("bg-BG", {
  timeZone: "Europe/Sofia",
  weekday: "short",
  day: "numeric",
  month: "long",
  year: "numeric",
});
function label(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  return fmt.format(new Date(Date.UTC(y, m - 1, day, 12))); // обед UTC → без day-shift
}

export function ClosuresManager({ initial }: { initial: string[] }) {
  const [dates, setDates] = React.useState(initial);
  const [pick, setPick] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function add() {
    if (!pick) return;
    if (dates.includes(pick)) {
      toast.error("Тази дата вече е затворена.");
      return;
    }
    setBusy(true);
    const prev = dates;
    setDates([...dates, pick].sort());
    try {
      let res = await addClosedDate(pick);
      // Записани часове в този ден (при всички изпълнители): потвърждение, после force.
      if (!res.ok && "conflicts" in res) {
        if (window.confirm(`${res.error}\n\nДа затворя деня въпреки това?`)) {
          res = await addClosedDate(pick, true);
        } else {
          setDates(prev);
          return;
        }
      }
      if (!res.ok) {
        setDates(prev);
        toast.error(res.error);
        return;
      }
      setPick("");
      toast.success("Затворен ден добавен.");
    } catch {
      setDates(prev);
      toast.error("Грешка при запис.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(d: string) {
    if (!window.confirm(`Да отворя ли отново ${label(d)}?`)) return;
    const prev = dates;
    setDates(dates.filter((x) => x !== d));
    try {
      await removeClosedDate(d);
    } catch {
      setDates(prev);
      toast.error("Грешка при премахване.");
    }
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div>
        <BookingCalendar value={pick} onChange={setPick} />
        <Button onClick={add} disabled={!pick || busy} className="mt-2 w-full rounded-full">
          <Plus className="size-4" /> Затвори избрания ден
        </Button>
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <span className="inline-flex items-center normal-case tracking-normal">
            Затворени дни ({dates.length})
            <FieldHint hint={FIELD_HINTS.closedDate} />
          </span>
        </p>
        {dates.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            Няма зададени затворени дни.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {dates.map((d) => (
              <li
                key={d}
                className="flex items-center justify-between gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm"
              >
                <span className="capitalize">{label(d)}</span>
                <button
                  type="button"
                  onClick={() => remove(d)}
                  aria-label={`Премахни ${d}`}
                  className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
