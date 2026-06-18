import type { Metadata } from "next";
import * as React from "react";
import Link from "next/link";
import { CalendarX2, MessageCircle, Phone, Plus, TrendingUp, Users } from "lucide-react";
import { Pencil } from "lucide-react";
import { requireStaff } from "@/lib/actions/auth-guard";
import { db } from "@/lib/db";
import { sofiaWallToUtc, sofiaWeekday, sofiaDateStr, sofiaTimeLabel } from "@/lib/booking/time";
import { KIND_BY_SLUG } from "@/lib/booking/kind";
import { parallelWindows } from "@/lib/booking/parallel";
import { StaffShell } from "@/components/staff/staff-shell";
import { InstallBanner } from "@/components/staff/install-banner";
import { StaffCancelButton } from "@/components/staff/cancel-booking-button";
import { BookingStatusActions } from "@/components/staff/booking-status-actions";
import { BookingEditSheet, type EditServiceOpt } from "@/components/staff/booking-edit-sheet";
import { ClientFileTrigger } from "@/components/staff/client-file-sheet";
import { ScheduleSearch, type UpcomingBooking } from "@/components/staff/schedule-search";
import { BiometricPrompt } from "@/components/staff/biometric-prompt";
import { ScheduleDateJump } from "@/components/staff/schedule-date-jump";

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

  const now = new Date();
  const todayKey = dateKeyFmt.format(now);
  const selectedKey = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : todayKey;

  const dayStart = sofiaWallToUtc(selectedKey, "00:00");
  const dayEnd = new Date(dayStart.getTime() + 24 * 3600000);
  const upcomingEnd = new Date(now.getTime() + 30 * 86400000);
  // Статус бутоните („Дойде" и т.н.) имат смисъл само за днешни/минали часове.
  const todayEnd = new Date(sofiaWallToUtc(todayKey, "00:00").getTime() + 24 * 3600000);

  // Дневен график + всички предстоящи часове за 30 дни напред (за search-а).
  const [bookings, upcomingRows] = await Promise.all([
    db.query.bookings.findMany({
      where: (b, { and, eq, gte, lt, notInArray }) =>
        and(eq(b.resourceId, resource.id), gte(b.startAt, dayStart), lt(b.startAt, dayEnd), notInArray(b.status, ["cancelled", "no_show"])),
      orderBy: (b, { asc }) => [asc(b.startAt)],
    }),
    db.query.bookings.findMany({
      where: (b, { and, eq, gte, lt, inArray }) =>
        and(eq(b.resourceId, resource.id), gte(b.startAt, now), lt(b.startAt, upcomingEnd), inArray(b.status, ["confirmed", "pending", "arrived"])),
      orderBy: (b, { asc }) => [asc(b.startAt)],
      columns: { id: true, startAt: true, serviceName: true, clientId: true, status: true },
    }),
  ]);

  const clientIds = [...new Set([...bookings, ...upcomingRows].map((b) => b.clientId).filter(Boolean) as string[])];
  const clients = clientIds.length ? await db.query.clients.findMany({ where: (c, { inArray }) => inArray(c.id, clientIds) }) : [];
  const clientById = new Map(clients.map((c) => [c.id, c]));

  // Услуги за edit формата (същата логика като /staff/new): каталог, филтриран
  // по вида на изпълнителя, и стеснен до собствените услуги ако са куратирани.
  const [svcItems, svcCats, mySvc] = await Promise.all([
    db.query.serviceItems.findMany({ orderBy: (s, { asc }) => [asc(s.sortOrder)] }),
    db.query.serviceCategories.findMany(),
    db.query.resourceServices.findMany({ where: (rs, { eq }) => eq(rs.resourceId, resource.id) }),
  ]);
  const svcCatById = new Map(svcCats.map((c) => [c.id, c]));
  const curated = mySvc.length > 0;
  const mineByItem = new Map(mySvc.map((m) => [m.serviceItemId, m]));
  const editServices: EditServiceOpt[] = svcItems.flatMap((i) => {
    const cat = svcCatById.get(i.categoryId);
    if (!cat || KIND_BY_SLUG[cat.slug] !== resource.kind) return [];
    if (curated && !mineByItem.has(i.id)) return [];
    const m = mineByItem.get(i.id);
    return [{ id: i.id, name: i.name, category: cat.shortTitle, durationMin: m?.durationMin ?? i.durationMin, bufferMin: m?.bufferMin ?? i.bufferMin }];
  });

  // Работно време за избрания ден (собствено ?? салонно) — за „свободно" прозорците.
  const wd = sofiaWeekday(selectedKey);
  const [ownWh, salonWh] = await Promise.all([
    db.query.resourceWorkingHours.findFirst({
      where: (w, { and, eq }) => and(eq(w.resourceId, resource.id), eq(w.weekday, wd)),
    }),
    db.query.workingHours.findFirst({ where: (w, { eq }) => eq(w.weekday, wd) }),
  ]);
  const wh = ownWh ?? salonWh;
  const openAt = wh && !wh.closed && wh.openTime ? sofiaWallToUtc(selectedKey, wh.openTime) : null;
  const closeAt = wh && !wh.closed && wh.closeTime ? sofiaWallToUtc(selectedKey, wh.closeTime) : null;

  // Свободни „престои" в чужди часове (напр. боя), в които се събира паралелен час.
  const wins = await parallelWindows(resource.id, dayStart, dayEnd);

  // Timeline = часове + „свободно" прозорци (>= 20 мин) между тях + паралелни престои.
  type TimelineItem =
    | { kind: "booking"; b: (typeof bookings)[number] }
    | { kind: "gap"; start: Date; end: Date }
    | { kind: "parallel"; start: Date; end: Date };
  const GAP_MIN = 20 * 60000;
  const items: TimelineItem[] = [];
  let cursor = openAt;
  for (const b of bookings) {
    if (cursor && b.startAt.getTime() - cursor.getTime() >= GAP_MIN) {
      items.push({ kind: "gap", start: cursor, end: b.startAt });
    }
    items.push({ kind: "booking", b });
    if (!cursor || b.endAt.getTime() > cursor.getTime()) cursor = b.endAt;
  }
  if (cursor && closeAt && closeAt.getTime() - cursor.getTime() >= GAP_MIN) {
    items.push({ kind: "gap", start: cursor, end: closeAt });
  }

  // Паралелните прозорци се вмъкват на хронологичното си място (вътре в чужди часове).
  for (const w of wins) {
    const win: TimelineItem = { kind: "parallel", start: new Date(w.start), end: new Date(w.end) };
    const at = items.findIndex((it) => (it.kind === "booking" ? it.b.startAt : it.start).getTime() > w.start);
    if (at === -1) items.push(win);
    else items.splice(at, 0, win);
  }

  // „Сега" линията се вмъква на хронологичното ѝ място (само за днешния ден).
  const isToday = selectedKey === todayKey;
  const itemStart = (it: TimelineItem) => (it.kind === "booking" ? it.b.startAt : it.start);
  const winFmt = (w: { start: number; end: number }) => `${timeFmt.format(new Date(w.start))}–${timeFmt.format(new Date(w.end))}`;
  const nowIndex = isToday ? items.findIndex((it) => itemStart(it).getTime() > now.getTime()) : -1;
  const nowPos = isToday ? (nowIndex === -1 ? items.length : nowIndex) : -1;

  // Компактен dataset за client-side търсенето.
  const upcoming: UpcomingBooking[] = upcomingRows.map((b) => {
    const client = b.clientId ? clientById.get(b.clientId) : undefined;
    return {
      id: b.id,
      startAtISO: b.startAt.toISOString(),
      serviceName: b.serviceName,
      clientName: client?.name ?? "",
      clientPhone: client?.phone ?? "",
      status: b.status,
    };
  });

  // 7 дни напред за date pills
  const pills = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getTime() + i * 86400000);
    return { key: dateKeyFmt.format(d), day: pillDay.format(d), num: pillNum.format(d) };
  });

  return (
    <StaffShell kind={resource.kind}>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground capitalize">{longFmt.format(dayStart)}</p>
          <h1 className="mt-1 font-display text-2xl font-medium">Твоят ден</h1>
        </div>
        <div className="flex items-center gap-1.5">
          <Link
            href="/staff/clients"
            aria-label="Клиенти"
            title="Клиенти"
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-background px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
          >
            <Users className="size-4" strokeWidth={1.8} /> Клиенти
          </Link>
          <Link
            href="/staff/profile"
            aria-label="Оборот"
            title="Оборот"
            className="grid size-9 place-items-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
          >
            <TrendingUp className="size-4" strokeWidth={1.8} />
          </Link>
        </div>
      </div>

      <BiometricPrompt />

      <ScheduleSearch upcoming={upcoming}>
        <ScheduleDateJump selected={selectedKey} todayKey={todayKey} />
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
            {items.map((item, idx) => {
              // „Сега" линия на хронологичното ѝ място (само днес).
              const nowLine =
                isToday && idx === nowPos ? (
                  <div key="now" className="relative mb-3 flex items-center" aria-label="Сега">
                    <span className="absolute -left-[52px] w-11 text-right text-[10px] font-bold tabular-nums text-destructive">
                      {timeFmt.format(now)}
                    </span>
                    <span className="absolute -left-[12px] size-3 rounded-full border-2 border-background bg-destructive" />
                    <div className="h-px flex-1 bg-destructive/60" />
                  </div>
                ) : null;

              if (item.kind === "gap") {
                const gapMins = Math.round((item.end.getTime() - item.start.getTime()) / 60000);
                return (
                  <React.Fragment key={`gap-${item.start.toISOString()}`}>
                    {nowLine}
                    <div className="relative mb-3">
                      <span className="absolute -left-[52px] top-0 w-11 text-right text-xs tabular-nums text-muted-foreground">
                        {timeFmt.format(item.start)}
                      </span>
                      <span className="absolute -left-[9px] top-1.5 size-2 rounded-full border-2 border-background bg-border" />
                      <div className="rounded-xl border border-dashed border-border/80 px-3.5 py-2 text-xs text-muted-foreground">
                        Свободно · {timeFmt.format(item.start)} – {timeFmt.format(item.end)} ({durationLabel(gapMins)})
                      </div>
                    </div>
                  </React.Fragment>
                );
              }

              if (item.kind === "parallel") {
                const winMins = Math.round((item.end.getTime() - item.start.getTime()) / 60000);
                const startKey = dateKeyFmt.format(item.start);
                return (
                  <React.Fragment key={`par-${item.start.toISOString()}`}>
                    {nowLine}
                    <div className="relative mb-3">
                      <span className="absolute -left-[52px] top-0 w-11 text-right text-xs tabular-nums text-primary/80">
                        {timeFmt.format(item.start)}
                      </span>
                      <span className="absolute -left-[9px] top-1.5 size-2 rounded-full border-2 border-background bg-primary/70" />
                      <Link
                        href={`/staff/new?date=${startKey}`}
                        className="flex items-center justify-between gap-2 rounded-xl border border-dashed border-primary/60 bg-primary/5 px-3.5 py-2 text-xs text-primary transition-colors hover:bg-primary/10"
                      >
                        <span>
                          Свободно (престой) · паралелен час · {timeFmt.format(item.start)} – {timeFmt.format(item.end)} ({durationLabel(winMins)})
                        </span>
                        <Plus className="size-3.5 shrink-0" strokeWidth={2.4} />
                      </Link>
                    </div>
                  </React.Fragment>
                );
              }

              const b = item.b;
              const client = b.clientId ? clientById.get(b.clientId) : undefined;
              const st = STATUS[b.status] ?? STATUS.pending;
              const mins = Math.round((b.endAt.getTime() - b.startAt.getTime()) / 60000);
              return (
                <React.Fragment key={b.id}>
                {nowLine}
                <div className="relative mb-3">
                  <span className="absolute -left-[52px] top-0 w-11 text-right text-xs font-bold tabular-nums text-muted-foreground">
                    {timeFmt.format(b.startAt)}
                  </span>
                  <span className="absolute -left-[10px] top-1.5 size-2.5 rounded-full border-2 border-background bg-primary" />
                  <div className={"rounded-2xl border p-3.5 " + st.block}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold leading-tight">{b.serviceName}</p>
                      <span className="flex shrink-0 items-center gap-1">
                        {b.allowParallel && (
                          <span className="rounded-full border border-dashed border-primary/60 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                            паралелен
                          </span>
                        )}
                        <span className={"rounded-full px-2 py-0.5 text-[10px] font-medium " + st.cls}>{st.label}</span>
                      </span>
                    </div>
                    {client && (
                      <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted-foreground">
                        <ClientFileTrigger
                          clientId={client.id}
                          name={client.name}
                          className="font-medium text-foreground underline decoration-border decoration-dotted underline-offset-[3px] transition-colors hover:decoration-foreground/60"
                        />
                        {client.phone && <span>· {client.phone}</span>}
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
                      <div className="flex shrink-0 items-center gap-1">
                        {(b.status === "confirmed" || b.status === "pending" || b.status === "arrived") && (
                          <BookingEditSheet
                            services={editServices}
                            booking={{
                              id: b.id,
                              serviceItemId: b.serviceItemId,
                              serviceName: b.serviceName,
                              clientName: client?.name ?? "",
                              clientPhone: client?.phone ?? "",
                              dateStr: sofiaDateStr(b.startAt),
                              timeStr: sofiaTimeLabel(b.startAt),
                              durationMin: mins,
                              activeMin: b.activeMin,
                              processingMin: b.processingMin,
                              notes: b.notes ?? "",
                            }}
                            trigger={
                              <button
                                type="button"
                                aria-label="Редактирай часа"
                                title="Редактирай"
                                className="grid size-7 place-items-center rounded-full bg-background/70 text-muted-foreground transition-colors hover:bg-foreground hover:text-background"
                              >
                                <Pencil className="size-3.5" strokeWidth={2} />
                              </button>
                            }
                          />
                        )}
                        {(b.status === "confirmed" || b.status === "pending") && <StaffCancelButton id={b.id} />}
                      </div>
                    </div>
                    {b.startAt.getTime() < todayEnd.getTime() && (b.status === "confirmed" || b.status === "arrived") && (
                      <BookingStatusActions id={b.id} status={b.status} />
                    )}
                    {b.notes && <p className="mt-1 text-xs text-muted-foreground">{b.notes}</p>}
                  </div>
                </div>
                </React.Fragment>
              );
            })}
            {/* „Сега" в края — когато всичко за деня е минало. */}
            {isToday && nowPos === items.length && items.length > 0 && (
              <div className="relative mb-3 flex items-center" aria-label="Сега">
                <span className="absolute -left-[52px] w-11 text-right text-[10px] font-bold tabular-nums text-destructive">
                  {timeFmt.format(now)}
                </span>
                <span className="absolute -left-[12px] size-3 rounded-full border-2 border-background bg-destructive" />
                <div className="h-px flex-1 bg-destructive/60" />
              </div>
            )}
          </div>
        )}
      </ScheduleSearch>

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
