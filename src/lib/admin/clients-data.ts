import { sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { BGN_PER_EUR } from "@/lib/booking/offering";
import { matchesQuery, type AdminClientRow, type ClientBooking, type ClientInfo } from "@/lib/admin/clients";

/**
 * Данните за /admin/clients по страници (№16). Сумите се смятат в базата за една страница клиенти;
 * правилата са тези от clients.ts (summarizeClients), проба: clients-data.proba.test.ts.
 * bookings.notes и client_notes не се четат (бележките на специалиста не стигат до страницата).
 * Цената е като в оборота (actions/revenue.ts): снимката price_eur → цената на специалиста →
 * каталожната.
 */
export const CLIENTS_PAGE_SIZE = 50;

const toEurSql = (price: SQL, currency: SQL) =>
  sql`CASE WHEN ${currency} = 'лв' THEN round(${price}::numeric / ${BGN_PER_EUR}, 2) ELSE ${price}::numeric END`;

/** Цената на един час в € (b е псевдонимът на bookings). */
const bookingPrice = sql`COALESCE(
  b.price_eur::numeric,
  (SELECT ${toEurSql(sql`rs.price`, sql`rs.currency`)} FROM resource_services rs
    WHERE rs.resource_id = b.resource_id AND rs.service_item_id = b.service_item_id LIMIT 1),
  (SELECT ${toEurSql(sql`si.price`, sql`si.currency`)} FROM service_items si WHERE si.id = b.service_item_id)
)`;

const ms = (col: SQL) => sql`(extract(epoch from ${col}) * 1000)::float8`;

export interface AdminClientsPage {
  rows: AdminClientRow[];
  total: number;
  page: number;
  pages: number;
  /** Специалистите, които имат клиенти (за филтъра). */
  filterResources: { id: string; name: string }[];
  resources: { id: string; name: string }[];
}

export async function loadAdminClientsPage(opts: {
  query: string;
  resourceId: string | null;
  page: number;
  nowMs: number;
}): Promise<AdminClientsPage> {
  const [resRows, matchIds] = await Promise.all([
    db.execute<{ id: string; name: string; has_clients: boolean }>(sql`
      SELECT r.id, r.name,
        EXISTS (SELECT 1 FROM bookings x WHERE x.resource_id = r.id AND x.client_id IS NOT NULL) AS has_clients
      FROM resources r
      ORDER BY r.active DESC, r.sort_order ASC, r.name ASC`),
    // Търсенето е същото като досега (matchesQuery: име без значение главни или малки, телефон във
    // всеки запис); чете само id, име и телефон на клиентите, без часовете.
    opts.query
      ? db.query.clients
          .findMany({ columns: { id: true, name: true, phone: true } })
          .then((cs) => cs.filter((c) => matchesQuery(c, opts.query)).map((c) => c.id))
      : Promise.resolve(null),
  ]);
  const resources = resRows.map((r) => ({ id: r.id, name: r.name }));
  const filterResources = resRows.filter((r) => r.has_clients).map((r) => ({ id: r.id, name: r.name }));
  const empty = { rows: [], total: 0, page: 1, pages: 1, filterResources, resources };
  if (matchIds && matchIds.length === 0) return empty;

  const where = sql`b.client_id IS NOT NULL
    ${matchIds ? sql`AND b.client_id IN ${matchIds}` : sql``}
    ${opts.resourceId ? sql`AND EXISTS (SELECT 1 FROM bookings y WHERE y.client_id = b.client_id AND y.resource_id = ${opts.resourceId})` : sql``}`;

  const countRows = await db.execute<{ n: number }>(
    sql`SELECT count(DISTINCT b.client_id)::int AS n FROM bookings b WHERE ${where}`,
  );
  const total = countRows[0]?.n ?? 0;
  if (total === 0) return empty;
  const pages = Math.ceil(total / CLIENTS_PAGE_SIZE);
  const page = Math.min(Math.max(1, Math.floor(opts.page) || 1), pages);
  const now = sql`${new Date(opts.nowMs).toISOString()}::timestamptz`;
  // Посещение: минал час, който не е отказан и не е «не се яви» (isVisit в clients.ts).
  const visit = sql`b.start_at <= ${now} AND b.status NOT IN ('cancelled', 'no_show')`;

  const rows = await db.execute<{
    id: string;
    name: string;
    phone: string;
    visits: number;
    spent: number;
    unpriced: number;
    no_shows: number;
    last_visit_ms: number | null;
    next_ms: number | null;
    last_activity_ms: number;
    resource_ids: string[];
  }>(sql`
    WITH bk AS (
      SELECT b.client_id, b.resource_id, b.start_at, b.status,
        (${visit}) AS is_visit, ${bookingPrice} AS price
      FROM bookings b
      WHERE ${where}
    ),
    per AS (
      SELECT client_id,
        count(*) FILTER (WHERE is_visit)::int AS visits,
        round(COALESCE(sum(price) FILTER (WHERE is_visit), 0), 2)::float8 AS spent,
        count(*) FILTER (WHERE is_visit AND price IS NULL)::int AS unpriced,
        count(*) FILTER (WHERE status = 'no_show')::int AS no_shows,
        ${ms(sql`max(start_at) FILTER (WHERE is_visit)`)} AS last_visit_ms,
        ${ms(sql`min(start_at) FILTER (WHERE start_at > ${now} AND status IN ('pending', 'confirmed', 'arrived'))`)} AS next_ms,
        ${ms(sql`max(start_at)`)} AS last_activity_ms
      FROM bk
      GROUP BY client_id
      ORDER BY max(start_at) DESC, client_id
      LIMIT ${CLIENTS_PAGE_SIZE} OFFSET ${(page - 1) * CLIENTS_PAGE_SIZE}
    )
    SELECT c.id, c.name, c.phone, per.visits, per.spent, per.unpriced, per.no_shows,
      per.last_visit_ms, per.next_ms, per.last_activity_ms,
      ARRAY(
        SELECT bk.resource_id FROM bk WHERE bk.client_id = c.id
        GROUP BY bk.resource_id ORDER BY count(*) DESC, bk.resource_id
      ) AS resource_ids
    FROM per JOIN clients c ON c.id = per.client_id
    ORDER BY per.last_activity_ms DESC, c.id`);

  return {
    rows: rows.map((r) => ({
      id: r.id,
      name: r.name,
      phone: r.phone,
      visits: r.visits,
      lastVisitMs: r.last_visit_ms,
      nextMs: r.next_ms,
      resourceIds: r.resource_ids,
      spent: r.spent,
      unpriced: r.unpriced,
      noShows: r.no_shows,
      lastActivityMs: r.last_activity_ms,
    })),
    total,
    page,
    pages,
    filterResources,
    resources,
  };
}

/** Историята на един клиент: зарежда се само когато е отворена. Без бележки. */
export async function loadClientHistory(
  clientId: string,
): Promise<{ client: ClientInfo; bookings: ClientBooking[] } | null> {
  const client = await db.query.clients.findFirst({
    where: (c, { eq }) => eq(c.id, clientId),
    columns: { id: true, name: true, phone: true },
  });
  if (!client) return null;
  const rows = await db.execute<{
    id: string;
    resource_id: string;
    service_name: string;
    start_ms: number;
    status: string;
    price: number | null;
  }>(sql`
    SELECT b.id, b.resource_id, b.service_name, ${ms(sql`b.start_at`)} AS start_ms, b.status,
      (${bookingPrice})::float8 AS price
    FROM bookings b
    WHERE b.client_id = ${clientId}
    ORDER BY b.start_at DESC`);
  return {
    client,
    bookings: rows.map((r) => ({
      id: r.id,
      clientId,
      resourceId: r.resource_id,
      serviceName: r.service_name,
      startMs: r.start_ms,
      status: r.status,
      price: r.price,
    })),
  };
}
