import type { Metadata } from "next";
import Link from "next/link";
import { CalendarX2, MessageCircle, Phone, Plus } from "lucide-react";
import { requireStaff } from "@/lib/actions/auth-guard";
import { db } from "@/lib/db";
import { sofiaWallToUtc } from "@/lib/booking/time";
import { StaffShell } from "@/components/staff/staff-shell";
import { InstallBanner } from "@/components/staff/install-banner";
import { StaffCancelButton } from "@/components/staff/cancel-booking-button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "График — Euphoria",
  robots: { index: false, follow: false },
};

const TZ = "Europe/Sofia";
const timeFmt = new Intl.DateTimeFormat("bg-BG", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false });
const dateKeyFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const longFmt = new Intl.DateTimeFormat("bg-BG", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });
const pillDay = new Intl.DateTimeFormat("bg-BG", { timeZone: TZ, weekday: "short" });
const pillNum = new Intl.DateTimeFormat("bg-BG", { timeZone: TZ, day: "numeric" });

const STATUS: Record<string, { label: string; cls: string; block: string }> = {
  confirmed: { label: "Потвърден", cls: "bg-mint/40 text-foreground", block: "bg-mint/25 border-mint/50" },
  arrived: { label: "Пристигна", cls: "bg-primary/20 text-foreground", block: "bg-primary/15 border-primary/40" },
  completed: { label: "Завършен", cls: "bg-secondary text-muted-foreground", block: "bg-secondary border-border" },
  pending: { label: "Чакащ", cls: "bg-secondary text-muted-foreground", block: "bg-secondary border-border" },
};

function durationLabel(min: number) {
  if (min < 60) return `${min} мин`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} ч ${m} мин` : `${h} ч`;
}

// Изчиства телефона за tel:/viber: линкове — оставя само водещ + и цифри.
function dialNumber(phone: string) {
  const trimmed = phone.trim();
  const plus = trimmed.startsWith("+") ? "+" : "";
  return plus + trimmed.replace(/\D/g, "");
}

export default async function StaffSchedulePage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { resource } = await requireStaff();
  const sp = await searchParams;

  const todayKey = dateKeyFmt.format(new Date());
  const selectedKey = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : todayKey;

  const dayStart = sofiaWallToUtc(selectedKey, "00:00");
  const dayEnd = new Date(dayStart.getTime() + 24 * 3600000);

  const bookings = await db.query.bookings.findMany({
    where: (b, { and, eq, gte, lt, notInArray }) =>
      and(eq(b.resourceId, resource.id), gte(b.startAt, dayStart), lt(b.startAt, dayEnd), notInArray(b.status, ["cancelled", "no_show"])),
    orderBy: (b, { asc }) => [asc(b.startAt)],
  });

  const clientIds = [...new Set(bookings.map((b) => b.clientId).filter(Boolean) as string[])];
  const clients = clientIds.length ? await db.query.clients.findMany({ where: (c, { inArray }) => inArray(c.id, clientIds) }) : [];
  const clientById = new Map(clients.map((c) => [c.id, c]));

  // 7 дни напред за date pills
  const base = new Date();
  const pills = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base.getTime() + i * 86400000);
    return { key: dateKeyFmt.format(d), day: pillDay.format(d), num: pillNum.format(d) };
  });

  return (
    <StaffShell>
      <div className="mb-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground capitalize">{longFmt.format(dayStart)}</p>
        <h1 className="mt-1 font-display text-2xl font-medium">Твоят ден</h1>
      </div>

      <div className="-mx-1 mb-5 flex gap-2 overflow-x-auto px-1 pb-1">
        {pills.map((p) => {
          const active = p.key === selectedKey;
          return (
            <Link
              key={p.key}
              href={p.key === todayKey ? "/staff" : `/staff?date=${p.key}`}
              className={
                "flex w-12 shrink-0 flex-col items-center rounded-2xl border py-2 transition-colors " +
                (active ? "border-foreground bg-foreground text-background" : "border-border bg-background hover:border-foreground/40")
              }
            >
              <span className={"text-[11px] font-medium " + (active ? "text-background/70" : "text-muted-foreground")}>{p.day}</span>
              <span className="mt-0.5 text-lg font-bold tabular-nums">{p.num}</span>
            </Link>
          );
        })}
      </div>

      <InstallBanner />

      {bookings.length === 0 ? (
        <div className="rounded-2xl border border-border bg-background p-8 text-center text-muted-foreground">
          <CalendarX2 className="mx-auto size-8" strokeWidth={1.5} />
          <p className="mt-3 text-sm">Няма записани часове за този ден.</p>
        </div>
      ) : (
        <div className="relative pl-[52px]">
          <div className="absolute bottom-2 left-[44px] top-1 w-px bg-border" />
          {bookings.map((b) => {
            const client = b.clientId ? clientById.get(b.clientId) : undefined;
            const st = STATUS[b.status] ?? STATUS.pending;
            const mins = Math.round((b.endAt.getTime() - b.startAt.getTime()) / 60000);
            return (
              <div key={b.id} className="relative mb-3">
                <span className="absolute -left-[52px] top-0 w-11 text-right text-xs font-bold tabular-nums text-muted-foreground">
                  {timeFmt.format(b.startAt)}
                </span>
                <span className="absolute -left-[10px] top-1.5 size-2.5 rounded-full border-2 border-background bg-primary" />
                <div className={"rounded-2xl border p-3.5 " + st.block}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold leading-tight">{b.serviceName}</p>
                    <span className={"shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium " + st.cls}>{st.label}</span>
                  </div>
                  {client && (
                    <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted-foreground">
                      <span>
                        {client.name}
                        {client.phone ? ` · ${client.phone}` : ""}
                      </span>
                      {client.phone && (
                        <span className="inline-flex items-center gap-1">
                          <a
                            href={`tel:${dialNumber(client.phone)}`}
                            aria-label={`Обади се на ${client.name}`}
                            title="Обади се"
                            className="inline-flex size-7 items-center justify-center rounded-full bg-primary/15 text-primary transition-colors hover:bg-primary hover:text-background"
                          >
                            <Phone className="size-3.5" strokeWidth={2.2} />
                          </a>
                          <a
                            href={`viber://chat?number=${dialNumber(client.phone)}`}
                            aria-label={`Пиши във Viber на ${client.name}`}
                            title="Viber"
                            className="inline-flex size-7 items-center justify-center rounded-full bg-primary/15 text-primary transition-colors hover:bg-primary hover:text-background"
                          >
                            <MessageCircle className="size-3.5" strokeWidth={2.2} />
                          </a>
                        </span>
                      )}
                    </div>
                  )}
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-primary">
                      {timeFmt.format(b.startAt)} – {timeFmt.format(b.endAt)} · {durationLabel(mins)}
                    </p>
                    {(b.status === "confirmed" || b.status === "pending") && <StaffCancelButton id={b.id} />}
                  </div>
                  {b.notes && <p className="mt-1 text-xs text-muted-foreground">{b.notes}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Link
        href="/staff/new"
        aria-label="Нов час"
        className="fixed bottom-[86px] left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-foreground px-5 py-3.5 text-sm font-semibold text-background shadow-xl shadow-foreground/25 hover:bg-primary sm:left-auto sm:right-[max(1rem,calc(50%-15rem))] sm:translate-x-0"
      >
        <Plus className="size-5" strokeWidth={2.4} /> Нов час
      </Link>
    </StaffShell>
  );
}
