import { formatEur, type RevenueStats } from "@/lib/booking/revenue";

const PERIODS = [
  { key: "today", label: "Днес" },
  { key: "week", label: "Седмица" },
  { key: "month", label: "Месец" },
] as const;

/**
 * Три карти (Днес/Седмица/Месец) с разбивка Изкарано (реализирано) + Очаквано
 * (бъдещи потвърдени). Responsive: компактно за staff PWA, по-едро за admin (sm:).
 */
export function RevenueTriCards({ stats }: { stats: RevenueStats }) {
  return (
    <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
      {PERIODS.map(({ key, label }) => {
        const p = stats[key];
        return (
          <div
            key={key}
            className="rounded-xl border border-border bg-background px-2 py-2.5 text-center sm:px-3 sm:py-4"
          >
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:text-xs">{label}</p>
            <p className="mt-1 text-base font-bold tabular-nums sm:text-2xl">{formatEur(p.earned.total)} €</p>
            <p className="text-[10px] text-muted-foreground sm:text-xs">
              {p.earned.count === 1 ? "1 час" : `${p.earned.count} часа`} изкарани
            </p>
            {p.expected.count > 0 && (
              <p className="mt-1 text-[10px] font-medium tabular-nums text-primary sm:text-xs">
                + {formatEur(p.expected.total)} € очаквани
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
