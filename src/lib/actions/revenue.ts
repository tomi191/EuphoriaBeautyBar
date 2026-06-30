import { db } from "@/lib/db";
import { requireAdmin, requireStaff } from "@/lib/actions/auth-guard";
import { buildPeriodBounds, summarizeRevenue, type RevenueStats } from "@/lib/booking/revenue";

interface LoadedRow {
  resourceId: string;
  startMs: number;
  status: string;
  price: number; // € — резолюрна (priceEur snapshot → собствена → каталожна → 0)
  priced: boolean; // има ли реална цена (false → без въведена цена, не влиза в сумите)
}

/**
 * Зарежда часовете за оборота в [fromMs, toMs) и резолюрва цената на всеки. Брои
 * всички записани часове (онлайн + телефон + на място — Снежана вписва всичко в
 * графика), без отменените/неявилите се; разделянето earned/expected става в
 * summarizeRevenue. resourceId по избор стеснява до един изпълнител (staff),
 * иначе целия салон (admin).
 */
async function loadRevenueRows(opts: { resourceId?: string; fromMs: number; toMs: number }): Promise<LoadedRow[]> {
  const from = new Date(opts.fromMs);
  const to = new Date(opts.toMs);
  const rows = await db.query.bookings.findMany({
    where: (b, { and, eq, gte, lt, notInArray }) =>
      and(
        notInArray(b.status, ["cancelled", "no_show"]),
        gte(b.startAt, from),
        lt(b.startAt, to),
        opts.resourceId ? eq(b.resourceId, opts.resourceId) : undefined,
      ),
    columns: { resourceId: true, startAt: true, status: true, priceEur: true, serviceItemId: true },
  });

  // Fallback цени за часове без снимка price_eur: собствената цена (resource_services) на
  // конкретния изпълнител, иначе каталожната (service_items). Едно зареждане за всички.
  const missingItemIds = [
    ...new Set(rows.filter((r) => r.priceEur == null && r.serviceItemId).map((r) => r.serviceItemId as string)),
  ];
  const [own, items] = missingItemIds.length
    ? await Promise.all([
        db.query.resourceServices.findMany({ where: (rs, { inArray }) => inArray(rs.serviceItemId, missingItemIds) }),
        db.query.serviceItems.findMany({ where: (s, { inArray }) => inArray(s.id, missingItemIds) }),
      ])
    : [[], []];
  // Currency guard: fallback цените влизат само ако са в € (каталогът е изцяло €, но
  // полето допуска „лв" по подразбиране — лв стойност, третирана като €, би надула оборота).
  const ownByKey = new Map(own.filter((o) => o.currency === "€").map((o) => [`${o.resourceId}:${o.serviceItemId}`, o.price]));
  const itemById = new Map(items.filter((i) => i.currency === "€").map((i) => [i.id, i.price]));

  return rows.map((r) => {
    const fallback = r.serviceItemId
      ? ownByKey.get(`${r.resourceId}:${r.serviceItemId}`) ?? itemById.get(r.serviceItemId)
      : undefined;
    // priceEur е по дефиниция евро-снимка; fallback вече е филтриран до €.
    const resolved = r.priceEur ?? fallback;
    return {
      resourceId: r.resourceId,
      startMs: r.startAt.getTime(),
      status: r.status,
      price: resolved ?? 0,
      priced: resolved != null, // няма нито snapshot, нито € fallback → без въведена цена
    };
  });
}

function rangeFor(now: Date) {
  const b = buildPeriodBounds(now);
  // Седмицата може да започва преди 1-во число и да преминава в следващия месец → покрий обединението.
  const fromMs = Math.min(b.weekStartMs, b.monthStartMs);
  const toMs = Math.max(b.weekEndMs, b.monthEndMs);
  return { b, fromMs, toMs };
}

/** Оборот на текущия изпълнител (staff PWA) — Изкарано + Очаквано по днес/седмица/месец. */
export async function getMyRevenue(): Promise<RevenueStats> {
  const { resource } = await requireStaff();
  const { b, fromMs, toMs } = rangeFor(new Date());
  const rows = await loadRevenueRows({ resourceId: resource.id, fromMs, toMs });
  return summarizeRevenue(rows, b);
}

export interface SalonRevenue {
  total: RevenueStats;
  byResource: { id: string; name: string; kind: string; stats: RevenueStats }[];
}

/** Оборот на целия салон (admin) — обща сума + разбивка по изпълнител, сортирана по принос за месеца. */
export async function getSalonRevenue(): Promise<SalonRevenue> {
  await requireAdmin();
  const { b, fromMs, toMs } = rangeFor(new Date());
  const rows = await loadRevenueRows({ fromMs, toMs });

  const total = summarizeRevenue(rows, b);

  const byId = new Map<string, LoadedRow[]>();
  for (const r of rows) {
    const arr = byId.get(r.resourceId);
    if (arr) arr.push(r);
    else byId.set(r.resourceId, [r]);
  }
  const resources = await db.query.resources.findMany({ columns: { id: true, name: true, kind: true } });
  const resMap = new Map(resources.map((r) => [r.id, r]));

  const byResource = [...byId.entries()]
    .map(([id, rs]) => ({
      id,
      name: resMap.get(id)?.name ?? "—",
      kind: resMap.get(id)?.kind ?? "",
      stats: summarizeRevenue(rs, b),
    }))
    // Скрий „phantom" редове: изпълнители без НИКАКВА активност в месеца (само часове
    // от съседен месец, влезли в прозореца заради седмица, преминаваща границата).
    // Таблицата показва месечни числа → такъв ред би се появил безсмислено с 0,00 €.
    .filter((r) => r.stats.month.earned.count + r.stats.month.expected.count + r.stats.month.unpriced > 0)
    // Подреди по приноса за месеца (изкарано + очаквано), най-голям отгоре.
    .sort(
      (a, c) =>
        c.stats.month.earned.total + c.stats.month.expected.total - (a.stats.month.earned.total + a.stats.month.expected.total),
    );

  return { total, byResource };
}
