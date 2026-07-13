import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/admin/page-header";
import { BookingForm } from "@/components/admin/booking-form";
import { BookingRowActions } from "@/components/admin/booking-row-actions";
import { sofiaWallToUtc, sofiaDateStr, sofiaTimeLabel } from "@/lib/booking/time";
import { sourceLabel, createdAtLabel } from "@/lib/booking/source";

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Чака", cls: "bg-secondary text-muted-foreground" },
  confirmed: { label: "Потвърден", cls: "bg-mint/40 text-foreground" },
  arrived: { label: "Дошъл", cls: "bg-blush/50 text-foreground" },
  in_progress: { label: "В процес", cls: "bg-blush/50 text-foreground" },
  completed: { label: "Завършен", cls: "bg-secondary text-muted-foreground" },
  no_show: { label: "Не се яви", cls: "bg-destructive/15 text-destructive" },
  cancelled: { label: "Отказан", cls: "bg-secondary text-muted-foreground line-through" },
};

function shiftDate(d: string, days: number) {
  const dt = new Date(`${d}T12:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; resource?: string }>;
}) {
  const sp = await searchParams;
  const date = sp.date ?? sofiaDateStr(new Date());
  const resourceFilter = sp.resource && sp.resource !== "all" ? sp.resource : null;

  const resources = await db.query.resources.findMany({
    where: (r, { eq }) => eq(r.active, true),
    orderBy: (r, { asc }) => [asc(r.sortOrder), asc(r.name)],
  });

  // услуги за формата
  const [cats, items] = await Promise.all([
    db.query.serviceCategories.findMany(),
    db.query.serviceItems.findMany({ orderBy: (s, { asc }) => [asc(s.sortOrder)] }),
  ]);
  const catMap = new Map(cats.map((c) => [c.id, c.shortTitle || c.title]));
  const services = items.map((i) => ({
    id: i.id,
    name: i.name,
    durationMin: i.durationMin,
    bufferMin: i.bufferMin,
    category: catMap.get(i.categoryId) ?? "",
  }));

  // часове за деня
  const dayStart = sofiaWallToUtc(date, "00:00");
  const dayEnd = new Date(dayStart.getTime() + 24 * 3600000);
  const dayBookings = await db.query.bookings.findMany({
    where: (b, { and, gte, lt, eq }) => {
      const conds = [gte(b.startAt, dayStart), lt(b.startAt, dayEnd)];
      if (resourceFilter) conds.push(eq(b.resourceId, resourceFilter));
      return and(...conds);
    },
    orderBy: (b, { asc }) => [asc(b.startAt)],
  });

  const clientIds = [...new Set(dayBookings.map((b) => b.clientId).filter(Boolean))] as string[];
  const clientRows = clientIds.length
    ? await db.query.clients.findMany({ where: (c, { inArray }) => inArray(c.id, clientIds) })
    : [];
  const clientMap = new Map(clientRows.map((c) => [c.id, c]));
  const resMap = new Map(resources.map((r) => [r.id, r]));

  const dateLabel = new Intl.DateTimeFormat("bg-BG", {
    timeZone: "Europe/Sofia",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(sofiaWallToUtc(date, "12:00"));

  const qResource = resourceFilter ? `&resource=${resourceFilter}` : "";

  return (
    <>
      <PageHeader
        title="График"
        subtitle="Записани часове по ден. Записвай и телефонни заявки оттук."
        action={
          <BookingForm
            resources={resources.map((r) => ({ id: r.id, name: r.name }))}
            services={services}
            defaultResourceId={resourceFilter ?? resources[0]?.id ?? ""}
            defaultDate={date}
            trigger={
              <Button className="bg-foreground text-background hover:bg-foreground/90">
                <Plus className="size-4" /> Нов час
              </Button>
            }
          />
        }
      />

      {/* навигация по дни */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/bookings?date=${shiftDate(date, -1)}${qResource}`}>
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <span className="min-w-48 text-center font-medium capitalize">{dateLabel}</span>
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/bookings?date=${shiftDate(date, 1)}${qResource}`}>
              <ChevronRight className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href={`/admin/bookings${resourceFilter ? `?resource=${resourceFilter}` : ""}`}>Днес</Link>
          </Button>
        </div>
      </div>

      {/* филтър по изпълнител */}
      {resources.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          <Link
            href={`/admin/bookings?date=${date}`}
            className={
              "rounded-full px-3 py-1 text-sm " +
              (!resourceFilter ? "bg-foreground text-background" : "bg-secondary hover:bg-secondary/70")
            }
          >
            Всички
          </Link>
          {resources.map((r) => (
            <Link
              key={r.id}
              href={`/admin/bookings?date=${date}&resource=${r.id}`}
              className={
                "rounded-full px-3 py-1 text-sm " +
                (resourceFilter === r.id ? "bg-foreground text-background" : "bg-secondary hover:bg-secondary/70")
              }
            >
              {r.name}
            </Link>
          ))}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">Час</TableHead>
              <TableHead>Услуга</TableHead>
              <TableHead>Клиент</TableHead>
              <TableHead>Изпълнител</TableHead>
              <TableHead>Записан</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dayBookings.map((b) => {
              const c = b.clientId ? clientMap.get(b.clientId) : null;
              const st = STATUS[b.status] ?? STATUS.pending;
              return (
                <TableRow key={b.id}>
                  <TableCell className="font-mono text-sm">
                    {sofiaTimeLabel(b.startAt)}–{sofiaTimeLabel(b.endAt)}
                  </TableCell>
                  <TableCell className="text-sm font-medium">{b.serviceName}</TableCell>
                  <TableCell className="text-sm">
                    {c ? (
                      <>
                        {c.name}
                        <span className="block text-xs text-muted-foreground">{c.phone}</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{resMap.get(b.resourceId)?.name ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <span className="tabular-nums">{createdAtLabel(b.createdAt)}</span>
                    <span className="mt-0.5 block">
                      <span className={"inline-flex rounded-full px-1.5 py-px text-[10px] font-medium " + (b.source === "online" ? "bg-mint/40 text-foreground" : "bg-secondary")}>
                        {sourceLabel(b.source)}
                      </span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={"inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium " + st.cls}>{st.label}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <BookingRowActions
                      id={b.id}
                      status={b.status}
                      services={services}
                      booking={{
                        id: b.id,
                        serviceItemId: b.serviceItemId,
                        serviceName: b.serviceName,
                        clientName: c?.name ?? "",
                        clientPhone: c?.phone ?? "",
                        dateStr: sofiaDateStr(b.startAt),
                        timeStr: sofiaTimeLabel(b.startAt),
                        durationMin: Math.round((b.endAt.getTime() - b.startAt.getTime()) / 60000),
                        activeMin: b.activeMin,
                        processingMin: b.processingMin,
                        notes: b.notes ?? "",
                      }}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
            {dayBookings.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                  Няма записани часове за този ден.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
