import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/admin/page-header";
import { requireAdmin } from "@/lib/actions/auth-guard";
import { loadAdminClients } from "@/lib/admin/clients-data";
import { filterClients, summarizeClients } from "@/lib/admin/clients";
import { formatBgPhone } from "@/lib/rental/inquiry-rules";
import { formatEuro } from "@/lib/booking/price";
import { sofiaTimeLabel } from "@/lib/booking/time";

// Етикетите на статуса: като в «График» (admin/bookings).
const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Чака", cls: "bg-secondary text-muted-foreground" },
  confirmed: { label: "Потвърден", cls: "bg-mint/40 text-foreground" },
  arrived: { label: "Дошъл", cls: "bg-blush/50 text-foreground" },
  in_progress: { label: "В процес", cls: "bg-blush/50 text-foreground" },
  completed: { label: "Завършен", cls: "bg-secondary text-muted-foreground" },
  no_show: { label: "Не се яви", cls: "bg-destructive/15 text-destructive" },
  cancelled: { label: "Отказан", cls: "bg-secondary text-muted-foreground line-through" },
};

const dateFmt = new Intl.DateTimeFormat("bg-BG", {
  timeZone: "Europe/Sofia",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const day = (ms: number) => dateFmt.format(new Date(ms)).replace(/\s*г\.$/, "");
const dayTime = (ms: number) => `${day(ms)}, ${sofiaTimeLabel(new Date(ms))}`;

const stickyHead = "text-right whitespace-nowrap sticky right-0 z-[1] bg-background";
const stickyCell =
  "text-right whitespace-nowrap sticky right-0 z-[1] bg-background group-hover:bg-[color-mix(in_oklab,var(--muted)_50%,var(--background))] shadow-[-10px_0_10px_-10px_rgba(0,0,0,0.18)] lg:shadow-none";

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}

export default async function AdminClientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const q = one(sp.q).slice(0, 80);
  const resourceParam = one(sp.resource);
  const clientParam = one(sp.client);

  const { clients, bookings, resources } = await loadAdminClients();
  const now = Date.now();
  const all = summarizeClients(clients, bookings, now);
  const resName = new Map(resources.map((r) => [r.id, r.name]));
  // Във филтъра: само специалистите, които имат клиенти.
  const withClients = new Set(all.flatMap((r) => r.resourceIds));
  const filterResources = resources.filter((r) => withClients.has(r.id));
  const resourceFilter = resName.has(resourceParam) ? resourceParam : null;
  const rows = filterClients(all, { query: q, resourceId: resourceFilter });

  const href = (p: { q?: string; resource?: string | null; client?: string | null }) => {
    const u = new URLSearchParams();
    if (p.q) u.set("q", p.q);
    if (p.resource) u.set("resource", p.resource);
    if (p.client) u.set("client", p.client);
    const s = u.toString();
    return `/admin/clients${s ? `?${s}` : ""}`;
  };

  const picked = clientParam ? all.find((r) => r.id === clientParam) ?? null : null;
  const history = picked
    ? bookings.filter((b) => b.clientId === picked.id).sort((a, b) => b.startMs - a.startMs)
    : [];

  return (
    <>
      <PageHeader title="Клиенти" subtitle="Кой при кого ходи: посещения, следващ час и колко е похарчил." />

      {/* търсене */}
      <form action="/admin/clients" method="get" className="mb-4 flex max-w-md gap-2">
        {resourceFilter && <input type="hidden" name="resource" value={resourceFilter} />}
        <Input
          name="q"
          defaultValue={q}
          placeholder="Име или телефон"
          aria-label="Търси по име или телефон"
          className="h-9"
        />
        <Button type="submit" variant="outline" size="sm" className="h-9">
          <Search className="size-4" /> Търси
        </Button>
      </form>

      {/* филтър по специалист */}
      {filterResources.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          <Link
            href={href({ q })}
            className={
              "rounded-full px-3 py-1 text-sm " +
              (!resourceFilter ? "bg-foreground text-background" : "bg-secondary hover:bg-secondary/70")
            }
          >
            Всички
          </Link>
          {filterResources.map((r) => (
            <Link
              key={r.id}
              href={href({ q, resource: r.id })}
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

      {/* историята на избрания клиент */}
      {picked && (
        <section id="istoriya" className="mb-6 scroll-mt-24">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-medium">История: {picked.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{formatBgPhone(picked.phone)}</p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href={href({ q, resource: resourceFilter })}>Затвори</Link>
            </Button>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата</TableHead>
                  <TableHead>Услуга</TableHead>
                  <TableHead>Специалист</TableHead>
                  <TableHead className="text-right">Цена</TableHead>
                  <TableHead>Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((b) => {
                  const st = STATUS[b.status] ?? { label: b.status, cls: "bg-secondary" };
                  return (
                    <TableRow key={b.id}>
                      <TableCell className="whitespace-nowrap text-sm">{dayTime(b.startMs)}</TableCell>
                      <TableCell className="text-sm">{b.serviceName}</TableCell>
                      <TableCell className="text-sm">{resName.get(b.resourceId) ?? "Специалист"}</TableCell>
                      <TableCell className="text-right text-sm whitespace-nowrap">
                        {b.price == null ? <span className="text-muted-foreground">без цена</span> : formatEuro(b.price)}
                      </TableCell>
                      <TableCell>
                        <span className={"rounded-full px-2 py-0.5 text-[11px] font-medium " + st.cls}>{st.label}</span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Клиент</TableHead>
              <TableHead className="text-right">Посещения</TableHead>
              <TableHead>Последно</TableHead>
              <TableHead>Следващ час</TableHead>
              <TableHead>При кого</TableHead>
              <TableHead className="text-right">Похарчено</TableHead>
              <TableHead className="text-right">Неявявания</TableHead>
              <TableHead className={stickyHead}>Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((c) => {
              const historyHref = `${href({ q, resource: resourceFilter, client: c.id })}#istoriya`;
              return (
                <TableRow key={c.id} className="group">
                  <TableCell>
                    <Link href={historyHref} className="font-medium hover:underline">
                      {c.name}
                    </Link>
                    <span className="block text-xs text-muted-foreground whitespace-nowrap">{formatBgPhone(c.phone)}</span>
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{c.visits}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm">{c.lastVisitMs ? day(c.lastVisitMs) : <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm">{c.nextMs ? dayTime(c.nextMs) : <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="text-sm">
                    {c.resourceIds.map((id) => resName.get(id) ?? "Специалист").join(", ")}
                  </TableCell>
                  <TableCell className="text-right text-sm whitespace-nowrap tabular-nums">
                    {formatEuro(c.spent)}
                    {c.unpriced > 0 && (
                      <span className="block text-[11px] text-muted-foreground">+{c.unpriced} без цена</span>
                    )}
                  </TableCell>
                  <TableCell className={"text-right text-sm tabular-nums" + (c.noShows > 0 ? " text-destructive" : "")}>
                    {c.noShows}
                  </TableCell>
                  <TableCell className={stickyCell}>
                    <Button asChild variant="outline" size="sm">
                      <Link href={historyHref}>История</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                  {all.length === 0 ? "Още няма клиенти със записан час." : "Няма клиент по това търсене."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
