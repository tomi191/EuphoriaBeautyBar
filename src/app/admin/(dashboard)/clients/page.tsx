import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/admin/page-header";
import { requireAdmin } from "@/lib/actions/auth-guard";
import { CLIENTS_PAGE_SIZE, loadAdminClientsPage, loadClientHistory } from "@/lib/admin/clients-data";
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
  const resourceParam = one(sp.staff);
  const clientParam = one(sp.client);
  const pageParam = Number.parseInt(one(sp.page), 10) || 1;

  // Страница от 50 клиента: сумите се смятат в базата; историята се чете само за отворения клиент.
  const [data, picked] = await Promise.all([
    loadAdminClientsPage({ query: q, resourceId: resourceParam || null, page: pageParam, nowMs: Date.now() }),
    clientParam ? loadClientHistory(clientParam) : null,
  ]);
  const { rows, total, page, pages, resources, filterResources } = data;
  const resName = new Map(resources.map((r) => [r.id, r.name]));
  const resourceFilter = resName.has(resourceParam) ? resourceParam : null;

  const href = (p: { q?: string; resource?: string | null; client?: string | null; page?: number }) => {
    const u = new URLSearchParams();
    if (p.q) u.set("q", p.q);
    if (p.resource) u.set("staff", p.resource);
    if (p.page && p.page > 1) u.set("page", String(p.page));
    if (p.client) u.set("client", p.client);
    const s = u.toString();
    return `/admin/clients${s ? `?${s}` : ""}`;
  };

  const history = picked?.bookings ?? [];
  const from = total === 0 ? 0 : (page - 1) * CLIENTS_PAGE_SIZE + 1;
  const to = Math.min(page * CLIENTS_PAGE_SIZE, total);

  return (
    <>
      <PageHeader title="Клиенти" subtitle="Кой при кого ходи: посещения, следващ час и колко е похарчил." />

      {/* търсене */}
      <form action="/admin/clients" method="get" className="mb-4 flex max-w-md gap-2">
        {resourceFilter && <input type="hidden" name="staff" value={resourceFilter} />}
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
              <h2 className="font-display text-xl font-medium">История: {picked.client.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{formatBgPhone(picked.client.phone)}</p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href={href({ q, resource: resourceFilter, page })}>Затвори</Link>
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
              const historyHref = `${href({ q, resource: resourceFilter, page, client: c.id })}#istoriya`;
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
                  {filterResources.length === 0 ? "Още няма клиенти със записан час." : "Няма клиент по това търсене."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* страници */}
      {total > 0 && (
        <nav aria-label="Страници" className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <p className="text-sm text-muted-foreground tabular-nums">
            Показани {from}–{to} от {total}
          </p>
          {pages > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-1">
              <PageLink href={page > 1 ? href({ q, resource: resourceFilter, page: page - 1 }) : null}>Назад</PageLink>
              {pageItems(page, pages).map((it, i) =>
                it.kind === "gap" ? (
                  <span key={`g${i}`} aria-hidden className={"px-1 text-muted-foreground " + it.cls}>
                    …
                  </span>
                ) : (
                  <PageLink
                    key={it.page}
                    href={href({ q, resource: resourceFilter, page: it.page })}
                    current={it.page === page}
                    className={it.cls}
                  >
                    {it.page}
                  </PageLink>
                ),
              )}
              <PageLink href={page < pages ? href({ q, resource: resourceFilter, page: page + 1 }) : null}>Напред</PageLink>
            </div>
          )}
        </nav>
      )}
    </>
  );
}

/** Бутон за страница: същият бутон на администрацията, поне 44 px. Без адрес е изключен. */
function PageLink({
  href,
  current,
  className = "",
  children,
}: {
  href: string | null;
  current?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const cls = "min-h-11 min-w-11 tabular-nums " + className;
  if (!href) {
    return (
      <Button variant="outline" className={cls} disabled>
        {children}
      </Button>
    );
  }
  return (
    <Button asChild variant={current ? "default" : "outline"} className={cls}>
      <Link href={href} aria-current={current ? "page" : undefined}>
        {children}
      </Link>
    </Button>
  );
}

type PageItem = { kind: "page"; page: number; cls: string } | { kind: "gap"; cls: string };

/**
 * Номерата: първата, последната и съседните на текущата; при над 4 страници на телефон съседите се
 * скриват, за да се събере редът на 390. «…» стои там, където има пропуск (с sm:hidden, ако пропускът
 * е само на телефон).
 */
function pageItems(page: number, pages: number): PageItem[] {
  const out: PageItem[] = [];
  let prevDesk = 0;
  let prevMobile = 0;
  for (let p = 1; p <= pages; p++) {
    const edge = p === 1 || p === pages;
    const mobile = edge || p === page || pages <= 4;
    if (!edge && Math.abs(p - page) > 1) continue;
    if (p - prevDesk > 1) out.push({ kind: "gap", cls: "" });
    else if (mobile && p - prevMobile > 1) out.push({ kind: "gap", cls: "sm:hidden" });
    out.push({ kind: "page", page: p, cls: mobile ? "" : "hidden sm:inline-flex" });
    prevDesk = p;
    if (mobile) prevMobile = p;
  }
  return out;
}
