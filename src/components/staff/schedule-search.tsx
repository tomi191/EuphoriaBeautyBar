"use client";

import * as React from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";

export type UpcomingBooking = {
  id: string;
  startAtISO: string;
  serviceName: string;
  clientName: string;
  clientPhone: string;
  status: string;
};

const TZ = "Europe/Sofia";
const dateKeyFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const rowDateFmt = new Intl.DateTimeFormat("bg-BG", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" });
const rowTimeFmt = new Intl.DateTimeFormat("bg-BG", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false });

const STATUS: Record<string, { label: string; cls: string }> = {
  confirmed: { label: "Потвърден", cls: "bg-mint/40 text-foreground" },
  arrived: { label: "Пристигна", cls: "bg-primary/20 text-foreground" },
  pending: { label: "Чакащ", cls: "bg-secondary text-muted-foreground" },
};

// Wrapper около дневния изглед: при 2+ знака в search полето резултатите
// заместват children (дневния timeline), за да няма безкраен скрол.
export function ScheduleSearch({ upcoming, children }: { upcoming: UpcomingBooking[]; children: React.ReactNode }) {
  const [query, setQuery] = React.useState("");
  const q = query.trim().toLowerCase();
  const active = q.length >= 2;

  const results = React.useMemo(() => {
    if (!active) return [];
    // Телефоните се сравняват и само по цифри, за да match-ва "088 123" срещу "0881234567".
    const qDigits = q.replace(/\D/g, "");
    return upcoming.filter((b) => {
      if (b.clientName.toLowerCase().includes(q)) return true;
      if (b.serviceName.toLowerCase().includes(q)) return true;
      if (b.clientPhone.toLowerCase().includes(q)) return true;
      if (qDigits.length >= 2 && b.clientPhone.replace(/\D/g, "").includes(qDigits)) return true;
      return false;
    });
  }, [active, q, upcoming]);

  return (
    <div>
      <div className="sticky top-14 z-10 -mx-4 mb-4 bg-background/90 px-4 py-2 backdrop-blur">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            strokeWidth={2}
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Търси клиент, телефон или услуга…"
            aria-label="Търсене в графика по клиент, телефон или услуга"
            autoComplete="off"
            className="h-11 w-full rounded-2xl border border-border bg-background pl-10 pr-10 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground/40 [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Изчисти търсенето"
              className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <X className="size-4" strokeWidth={2.2} />
            </button>
          )}
        </div>
      </div>

      {active ? (
        results.length === 0 ? (
          <div className="rounded-2xl border border-border bg-background p-6 text-center text-sm text-muted-foreground">
            Няма намерени часове за „{query.trim()}“ в следващите 30 дни.
          </div>
        ) : (
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              {results.length} {results.length === 1 ? "намерен час" : "намерени часа"} в следващите 30 дни
            </p>
            <div className="space-y-2">
              {results.map((b) => {
                const start = new Date(b.startAtISO);
                const st = STATUS[b.status] ?? STATUS.pending;
                return (
                  <Link
                    key={b.id}
                    href={`/staff?date=${dateKeyFmt.format(start)}`}
                    onClick={() => setQuery("")}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-background px-3 py-2 transition-colors hover:border-foreground/40"
                  >
                    <div className="w-16 shrink-0">
                      <p className="text-[11px] font-medium capitalize text-muted-foreground">{rowDateFmt.format(start)}</p>
                      <p className="text-sm font-bold tabular-nums">{rowTimeFmt.format(start)}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold leading-tight">{b.serviceName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {b.clientName}
                        {b.clientPhone ? ` · ${b.clientPhone}` : ""}
                      </p>
                    </div>
                    <span className={"shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium " + st.cls}>{st.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )
      ) : (
        children
      )}
    </div>
  );
}
