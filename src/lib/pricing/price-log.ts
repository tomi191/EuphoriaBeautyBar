import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { lowestPriceInWindow, type LowestPriceResult, type PriceLogEntry } from "@/lib/pricing/price-history";

/** Откъде е смяната на цената (колоната source в price_log). */
export type PriceSource = "staff_app" | "admin" | "script";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Пуска записите в една транзакция и казва на тригера на дневника на цените (0003_price_log.sql) кой и откъде
 * сменя цената. Без това тригерът пак пише реда, но със source = 'direct'.
 */
export function withPriceLog<T>(source: PriceSource, actor: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select set_config('app.price_source', ${source}, true), set_config('app.price_actor', ${actor}, true)`,
    );
    return fn(tx);
  });
}

/**
 * Най-ниската цена за последните 30 дни към `at` за услуга при специалист (собствената му цена, ако я има,
 * иначе каталожната, както в resolveOffering). Правилата са в lowestPriceInWindow.
 */
export async function lowestPriceLast30Days(
  resourceId: string | null,
  serviceItemId: string,
  at: Date = new Date(),
): Promise<LowestPriceResult & { table: "resource_services" | "service_items" | null }> {
  const rs = resourceId
    ? await db.query.resourceServices.findFirst({
        where: (r, { and, eq }) => and(eq(r.resourceId, resourceId), eq(r.serviceItemId, serviceItemId)),
      })
    : undefined;
  const item = rs ? undefined : await db.query.serviceItems.findFirst({ where: (s, { eq }) => eq(s.id, serviceItemId) });
  const table = rs ? "resource_services" : item ? "service_items" : null;
  const rowId = rs?.id ?? item?.id;
  const rows = table && rowId
    ? await db
        .select()
        .from(schema.priceLog)
        .where(and(eq(schema.priceLog.tableName, table), eq(schema.priceLog.rowId, rowId)))
    : [];
  const entries: PriceLogEntry[] = rows.map((r) => ({
    event: r.event as PriceLogEntry["event"],
    changedAt: r.changedAt,
    next: { price: r.newPrice, priceMax: r.newPriceMax, priceFrom: r.newPriceFrom, currency: r.newCurrency },
  }));
  const row = rs ?? item;
  const current = row
    ? {
        price: row.price,
        priceMax: row.priceMax,
        priceFrom: row.priceFrom,
        currency: row.currency,
        ...(rs ? { createdAt: rs.createdAt, updatedAt: rs.updatedAt } : {}),
      }
    : null;
  return { ...lowestPriceInWindow({ at, entries, current }), table };
}
