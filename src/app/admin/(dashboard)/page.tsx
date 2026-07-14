import Link from "next/link";
import { ArrowUpRight, CalendarClock, CalendarPlus, HelpCircle, Image as ImageIcon, MessageSquare, Newspaper, Scissors, Star, Users, Wallet } from "lucide-react";
import { db, schema } from "@/lib/db";
import { desc, sql } from "drizzle-orm";
import { getSalonRevenue } from "@/lib/actions/revenue";
import { formatEur } from "@/lib/booking/revenue";
import { sourceLabel, createdAtLabel } from "@/lib/booking/source";
import { sofiaDateStr, sofiaTimeLabel } from "@/lib/booking/time";

/** Последните записвания по МОМЕНТ НА ЗАПИСВАНЕ (не по час на посещение). */
async function recentBookings(limit = 8) {
  const rows = await db.query.bookings.findMany({
    orderBy: (b) => [desc(b.createdAt)],
    limit,
  });
  const clientIds = [...new Set(rows.map((b) => b.clientId).filter(Boolean))] as string[];
  const [clients, resources] = await Promise.all([
    clientIds.length ? db.query.clients.findMany({ where: (c, { inArray }) => inArray(c.id, clientIds) }) : [],
    db.query.resources.findMany({ columns: { id: true, name: true } }),
  ]);
  const clientMap = new Map(clients.map((c) => [c.id, c]));
  const resMap = new Map(resources.map((r) => [r.id, r.name]));
  return rows.map((b) => ({
    id: b.id,
    createdAt: b.createdAt,
    source: b.source,
    status: b.status,
    serviceName: b.serviceName,
    startAt: b.startAt,
    clientName: (b.clientId && clientMap.get(b.clientId)?.name) || "—",
    performer: resMap.get(b.resourceId) ?? "—",
    notifyLog: b.notifyLog as { push?: { sent: number; failed: number }; telegram?: boolean; adminTelegram?: boolean; salonEmail?: boolean } | null,
  }));
}

/** Компактен ред „кои известия минаха" за онлайн запис (null = стар запис без лог). */
function notifySummary(log: NonNullable<Awaited<ReturnType<typeof recentBookings>>[number]["notifyLog"]>): string {
  const parts: string[] = [];
  if (log.push) parts.push(`push ${log.push.sent}/${log.push.sent + log.push.failed}`);
  parts.push(`TG ${log.telegram ? "✓" : "✗"}`);
  if (log.adminTelegram !== undefined) parts.push(`админ TG ${log.adminTelegram ? "✓" : "✗"}`);
  if (log.salonEmail !== undefined) parts.push(`имейл ${log.salonEmail ? "✓" : "✗"}`);
  return parts.join(" · ");
}

const whenFmt = new Intl.DateTimeFormat("bg-BG", { timeZone: "Europe/Sofia", day: "2-digit", month: "2-digit" });

async function counts() {
  const [t, s, b, r, g, f, gr] = await Promise.all([
    db.select({ c: sql<number>`count(*)` }).from(schema.teamMembers),
    db.select({ c: sql<number>`count(*)` }).from(schema.serviceCategories),
    db.select({ c: sql<number>`count(*)` }).from(schema.blogPosts),
    db.select({ c: sql<number>`count(*)` }).from(schema.testimonials),
    db.select({ c: sql<number>`count(*)` }).from(schema.galleryImages),
    db.select({ c: sql<number>`count(*)` }).from(schema.faqItems),
    db.select({ c: sql<number>`count(*)` }).from(schema.googleReviews),
  ]);
  return {
    team: t[0]?.c ?? 0,
    services: s[0]?.c ?? 0,
    blog: b[0]?.c ?? 0,
    testimonials: r[0]?.c ?? 0,
    gallery: g[0]?.c ?? 0,
    faq: f[0]?.c ?? 0,
    googleReviews: gr[0]?.c ?? 0,
  };
}

const stats = [
  { key: "team", label: "Екип", icon: Users, href: "/admin/team" },
  { key: "services", label: "Категории услуги", icon: Scissors, href: "/admin/services" },
  { key: "blog", label: "Статии", icon: Newspaper, href: "/admin/blog" },
  { key: "testimonials", label: "Ръчни отзиви", icon: MessageSquare, href: "/admin/testimonials" },
  { key: "googleReviews", label: "Google ревюта", icon: Star, href: "/admin/reviews" },
  { key: "gallery", label: "Галерия", icon: ImageIcon, href: "/admin/gallery" },
  { key: "faq", label: "ЧЗВ", icon: HelpCircle, href: "/admin/faq" },
] as const;

export default async function AdminDashboardPage() {
  const [data, revenue, recent] = await Promise.all([counts(), getSalonRevenue(), recentBookings()]);
  const m = revenue.total.month;

  return (
    <>
      <header className="mb-10 border-b border-border pb-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Табло</p>
        <h1 className="mt-2 font-display text-3xl font-medium md:text-4xl">Преглед на салона</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Бърз преглед на съдържанието и преки пътеки до управление.
        </p>
      </header>

      <Link
        href="/admin/revenue"
        className="group mb-8 block rounded-xl border border-foreground bg-foreground p-6 text-background transition-opacity hover:opacity-95"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-background/60">
              <Wallet className="size-4" strokeWidth={1.8} /> Оборот този месец
            </p>
            <p className="mt-3 font-display text-4xl font-medium tabular-nums">{formatEur(m.earned.total)} €</p>
            <p className="mt-1 text-sm text-background/70">
              изкарани от {m.earned.count} {m.earned.count === 1 ? "час" : "часа"}
              {m.expected.total > 0 && (
                <>
                  {" "}· очакват се още <span className="font-semibold text-mint">{formatEur(m.expected.total)} €</span>
                </>
              )}
            </p>
          </div>
          <ArrowUpRight className="size-5 shrink-0 text-background/40 transition-colors group-hover:text-background" />
        </div>
      </Link>

      {/* Последни записвания — по момент на ЗАПИСВАНЕ (отговаря на „кой кога се записа") */}
      <section className="mb-8 rounded-xl border border-border bg-background p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
            <CalendarPlus className="size-4" strokeWidth={1.8} /> Последни записвания
          </h2>
          <Link href="/admin/bookings" className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
            към графика
          </Link>
        </div>
        <ul className="mt-4 divide-y divide-border/70">
          {recent.map((b) => (
            <li key={b.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2.5 text-sm">
              <span className="w-28 shrink-0 font-mono text-xs tabular-nums text-muted-foreground" title="Кога е направен записът">
                {createdAtLabel(b.createdAt)}
              </span>
              <span
                className={
                  "inline-flex shrink-0 rounded-full px-1.5 py-px text-[10px] font-medium " +
                  (b.source === "online" ? "bg-mint/40 text-foreground" : "bg-secondary text-muted-foreground")
                }
              >
                {sourceLabel(b.source)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="font-medium">{b.clientName}</span>
                <span className="text-muted-foreground"> — {b.serviceName}</span>
              </span>
              <Link
                href={`/admin/bookings?date=${sofiaDateStr(b.startAt)}`}
                className={"shrink-0 text-xs tabular-nums text-muted-foreground underline-offset-2 hover:text-foreground hover:underline" + (b.status === "cancelled" ? " line-through" : "")}
                title="Отвори деня в графика"
              >
                за {whenFmt.format(b.startAt)}, {sofiaTimeLabel(b.startAt)} · {b.performer}
              </Link>
              {b.notifyLog && (
                <span className="w-full pl-[7.75rem] font-mono text-[10px] leading-tight text-muted-foreground/70" title="Резултат от известията при записването">
                  известия: {notifySummary(b.notifyLog)}
                </span>
              )}
            </li>
          ))}
          {recent.length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">Още няма записвания.</li>}
        </ul>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ key, label, icon: Icon, href }) => (
          <Link
            key={key}
            href={href}
            className="group block rounded-xl border border-border bg-background p-5 transition-colors hover:border-foreground/40"
          >
            <div className="flex items-center justify-between">
              <Icon className="size-4 text-muted-foreground" strokeWidth={1.6} />
              <ArrowUpRight className="size-4 text-muted-foreground/40 transition-colors group-hover:text-foreground" />
            </div>
            <p className="mt-6 font-display text-3xl font-medium">{data[key as keyof typeof data]}</p>
            <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
          </Link>
        ))}
      </section>

      <section className="mt-8 grid gap-3 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-background p-6 lg:col-span-2">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Бързи действия</h2>
          <div className="mt-4 grid gap-1.5 sm:grid-cols-2">
            <QuickAction href="/admin/team" icon={Users} label="Член на екипа" />
            <QuickAction href="/admin/services" icon={Scissors} label="Промени цена" />
            <QuickAction href="/admin/testimonials" icon={MessageSquare} label="Качи отзив" />
            <QuickAction href="/admin/reviews" icon={Star} label="Синхронизирай Google" />
            <QuickAction href="/admin/blog" icon={Newspaper} label="Статии в блога" />
            <QuickAction href="/admin/faq" icon={HelpCircle} label="Често задавани въпроси" />
          </div>
        </div>

        <div className="rounded-xl border border-foreground bg-foreground p-6 text-background">
          <h2 className="text-sm font-medium uppercase tracking-wider text-background/60">SEO + GEO</h2>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex items-center justify-between border-b border-background/10 pb-2"><span>Sitemap.xml</span><a href="/sitemap.xml" target="_blank" className="text-mint hover:underline">отвори</a></li>
            <li className="flex items-center justify-between border-b border-background/10 pb-2"><span>Robots.txt</span><a href="/robots.txt" target="_blank" className="text-mint hover:underline">отвори</a></li>
            <li className="flex items-center justify-between border-b border-background/10 pb-2"><span>llms.txt</span><a href="/llms.txt" target="_blank" className="text-mint hover:underline">отвори</a></li>
            <li className="flex items-center justify-between"><span>JSON-LD</span><span className="text-mint">активна</span></li>
          </ul>
        </div>
      </section>

      <section className="mt-8 rounded-xl border border-border bg-background p-6">
        <div className="flex items-start gap-3">
          <CalendarClock className="mt-0.5 size-4 text-muted-foreground" strokeWidth={1.6} />
          <div className="text-sm">
            <p className="font-medium">Pipeline на админа</p>
            <p className="mt-1 text-muted-foreground">
              Workflow-ът е оптимизиран за beauty салон: най-честите промени (цени, екип, отзиви) са на първо ниво. Блогът, галерията и настройките — на второ. Google ревютата се синхронизират ръчно или по cron.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

function QuickAction({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) {
  return (
    <Link href={href} className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3 text-sm transition-colors hover:bg-secondary">
      <span className="flex items-center gap-3">
        <Icon className="size-4 text-muted-foreground" strokeWidth={1.6} />
        {label}
      </span>
      <ArrowUpRight className="size-3.5 text-muted-foreground/60" />
    </Link>
  );
}
