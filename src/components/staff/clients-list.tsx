"use client";

import * as React from "react";
import { Search, Users, X } from "lucide-react";
import { ClientFileSheet } from "@/components/staff/client-file-sheet";
import type { MyClientRow } from "@/lib/actions/staff-clients";

const TZ = "Europe/Sofia";
const lastVisitFmt = new Intl.DateTimeFormat("bg-BG", { timeZone: TZ, day: "numeric", month: "short", year: "numeric" });

/** Списък на клиентите на изпълнителя с търсене по име/телефон; клик отваря досието. */
export function ClientsList({ clients }: { clients: MyClientRow[] }) {
  const [query, setQuery] = React.useState("");
  const [openId, setOpenId] = React.useState<string | null>(null);

  const q = query.trim().toLowerCase();
  const qDigits = q.replace(/\D/g, "");
  const shown = q === ""
    ? clients
    : clients.filter((c) => {
        if (c.name.toLowerCase().includes(q)) return true;
        if (c.phone.toLowerCase().includes(q)) return true;
        if (qDigits.length >= 2 && c.phone.replace(/\D/g, "").includes(qDigits)) return true;
        return false;
      });

  return (
    <>
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" strokeWidth={2} />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Търси по име или телефон…"
          aria-label="Търсене на клиент по име или телефон"
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

      {clients.length === 0 ? (
        <div className="rounded-2xl border border-border bg-background p-8 text-center text-muted-foreground">
          <Users className="mx-auto size-8" strokeWidth={1.5} />
          <p className="mt-3 text-sm">Още нямаш клиенти със записан час.</p>
        </div>
      ) : shown.length === 0 ? (
        <div className="rounded-2xl border border-border bg-background p-6 text-center text-sm text-muted-foreground">
          Няма клиент по това търсене.
        </div>
      ) : (
        <div className="space-y-1.5">
          {shown.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setOpenId(c.id)}
              className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-background px-3.5 py-3 text-left transition-colors hover:border-foreground/40"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold leading-tight">{c.name}</span>
                {c.phone && <span className="mt-0.5 block text-xs text-muted-foreground">{c.phone}</span>}
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-xs tabular-nums text-muted-foreground">{lastVisitFmt.format(new Date(c.lastVisitISO))}</span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground/70">
                  {c.visitCount === 1 ? "1 час" : `${c.visitCount} часа`}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      {openId && <ClientFileSheet clientId={openId} onClose={() => setOpenId(null)} />}
    </>
  );
}
