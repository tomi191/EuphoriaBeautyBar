/**
 * Клиентите в администрацията (/admin/clients, задача №16): чисто ядро без база, за тестове.
 * Посещение е минал час, който не е отказан и не е «не се яви» (същото като «Изкарано» в оборота:
 * не зависи от ръчно маркиране). Бележките на специалиста за клиента тук НЕ влизат: политиката за
 * поверителност обещава, че ги вижда само неговият специалист.
 */

/** Един час, сведен до нужното (цената вече е в €; null = без цена). Без бележки. */
export interface ClientBooking {
  id: string;
  clientId: string;
  resourceId: string;
  serviceName: string;
  startMs: number;
  status: string;
  price: number | null;
}

export interface ClientInfo {
  id: string;
  name: string;
  phone: string;
}

export interface AdminClientRow {
  id: string;
  name: string;
  phone: string;
  visits: number;
  lastVisitMs: number | null;
  nextMs: number | null;
  /** Специалистите на клиента, първо този с най-много часове. */
  resourceIds: string[];
  spent: number;
  /** Посещения без цена (не влизат в «Похарчено»). */
  unpriced: number;
  noShows: number;
  lastActivityMs: number;
}

const VOID_STATUSES = new Set(["cancelled", "no_show"]);
// Като FUTURE_STATUSES в booking/future-bookings: бъдещ час, който още стои.
const NEXT_STATUSES = new Set(["pending", "confirmed", "arrived"]);

export function isVisit(b: Pick<ClientBooking, "startMs" | "status">, nowMs: number): boolean {
  return b.startMs <= nowMs && !VOID_STATUSES.has(b.status);
}

/** Ред за всеки клиент с поне един час; първо този с най-скорошен час. */
export function summarizeClients(clients: ClientInfo[], bookings: ClientBooking[], nowMs: number): AdminClientRow[] {
  const byClient = new Map<string, ClientBooking[]>();
  for (const b of bookings) {
    const list = byClient.get(b.clientId);
    if (list) list.push(b);
    else byClient.set(b.clientId, [b]);
  }

  const rows: AdminClientRow[] = [];
  for (const c of clients) {
    const list = byClient.get(c.id);
    if (!list) continue;
    let visits = 0;
    let spent = 0;
    let unpriced = 0;
    let noShows = 0;
    let lastVisitMs: number | null = null;
    let nextMs: number | null = null;
    let lastActivityMs = 0;
    const perResource = new Map<string, number>();
    for (const b of list) {
      perResource.set(b.resourceId, (perResource.get(b.resourceId) ?? 0) + 1);
      if (b.startMs > lastActivityMs) lastActivityMs = b.startMs;
      if (b.status === "no_show") noShows += 1;
      if (isVisit(b, nowMs)) {
        visits += 1;
        if (b.price == null) unpriced += 1;
        else spent += b.price;
        if (lastVisitMs == null || b.startMs > lastVisitMs) lastVisitMs = b.startMs;
      } else if (b.startMs > nowMs && NEXT_STATUSES.has(b.status)) {
        if (nextMs == null || b.startMs < nextMs) nextMs = b.startMs;
      }
    }
    const resourceIds = [...perResource.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
    rows.push({
      id: c.id,
      name: c.name,
      phone: c.phone,
      visits,
      lastVisitMs,
      nextMs,
      resourceIds,
      spent: Math.round(spent * 100) / 100,
      unpriced,
      noShows,
      lastActivityMs,
    });
  }
  return rows.sort((a, b) => b.lastActivityMs - a.lastActivityMs);
}

/** Търсене по име (без значение главни или малки) или по телефон (в който и да е запис: 0888…, +359888…). */
export function matchesQuery(row: Pick<AdminClientRow, "name" | "phone">, query: string): boolean {
  const q = query.trim().toLocaleLowerCase("bg");
  if (!q) return true;
  if (row.name.toLocaleLowerCase("bg").includes(q)) return true;
  const qDigits = q.replace(/[^0-9]/g, "");
  if (qDigits.length < 3) return false;
  const digits = row.phone.replace(/[^0-9]/g, "");
  const national = digits.startsWith("359") ? digits.slice(3) : digits.replace(/^0/, "");
  return digits.includes(qDigits) || `0${national}`.includes(qDigits) || `359${national}`.includes(qDigits);
}

export function filterClients(rows: AdminClientRow[], opts: { query?: string; resourceId?: string | null }): AdminClientRow[] {
  return rows.filter(
    (r) => (!opts.resourceId || r.resourceIds.includes(opts.resourceId)) && matchesQuery(r, opts.query ?? ""),
  );
}
