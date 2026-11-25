/**
 * №16 страници: сумите от базата (loadAdminClientsPage) срещу правилата в clients.ts (summarizeClients,
 * filterClients) върху всички часове. Само четене. Срещу пробната база: PROBA_DB=1, PROBA_DB_NAME=<база>
 * в euphoria-proba-8a (127.0.0.1:54331).
 */
import { beforeAll, describe, expect, it } from "vitest";
import type { ClientBooking } from "./clients";

type Mods = {
  db: typeof import("@/lib/db");
  data: typeof import("./clients-data");
  core: typeof import("./clients");
  offering: typeof import("@/lib/booking/offering");
};
let m: Mods;
const NOW = Date.now();
let bookings: ClientBooking[] = [];
let oracle: import("./clients").AdminClientRow[] = [];

/** Старото четене (до страниците): всички часове с клиент и цената като в оборота. */
async function loadAll() {
  const { db } = m.db;
  const rows = await db.query.bookings.findMany({
    where: (b, { isNotNull }) => isNotNull(b.clientId),
    columns: { id: true, clientId: true, resourceId: true, serviceName: true, serviceItemId: true, startAt: true, status: true, priceEur: true },
  });
  const clients = await db.query.clients.findMany({ columns: { id: true, name: true, phone: true } });
  const own = await db.query.resourceServices.findMany();
  const items = await db.query.serviceItems.findMany();
  const ownByKey = new Map(own.map((o) => [`${o.resourceId}:${o.serviceItemId}`, m.offering.toEur(o.price, o.currency)]));
  const itemById = new Map(items.map((i) => [i.id, m.offering.toEur(i.price, i.currency)]));
  const list: ClientBooking[] = rows.map((r) => ({
    id: r.id,
    clientId: r.clientId as string,
    resourceId: r.resourceId,
    serviceName: r.serviceName,
    startMs: r.startAt.getTime(),
    status: r.status,
    price: r.priceEur ?? (r.serviceItemId ? ownByKey.get(`${r.resourceId}:${r.serviceItemId}`) ?? itemById.get(r.serviceItemId) ?? null : null),
  }));
  return { clients, list };
}

const byActivity = <T extends { lastActivityMs: number; id: string }>(rows: T[]) =>
  [...rows].sort((a, b) => b.lastActivityMs - a.lastActivityMs || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

/** Ред без реда на специалистите при равен брой часове (там редът е по id). */
const norm = (r: import("./clients").AdminClientRow) => ({ ...r, resourceIds: [...r.resourceIds].sort() });

async function allPages(query: string, resourceId: string | null) {
  const first = await m.data.loadAdminClientsPage({ query, resourceId, page: 1, nowMs: NOW });
  const pages = [first];
  for (let p = 2; p <= first.pages; p++) pages.push(await m.data.loadAdminClientsPage({ query, resourceId, page: p, nowMs: NOW }));
  return pages;
}

describe.skipIf(!process.env.PROBA_DB)("№16: клиенти по страници в пробната база", () => {
  beforeAll(async () => {
    (await import("dotenv")).config({ path: ".env.local", quiet: true });
    for (const k of ["DATABASE_URL", "DATABASE_URL_SESSION"] as const) {
      const u = new URL(process.env[k] ?? "");
      if (process.env.PROBA_DB_NAME) u.pathname = `/${process.env.PROBA_DB_NAME}`;
      process.env[k] = u.toString();
    }
    if (!/@(127\.0\.0\.1|localhost):54331\//.test(process.env.DATABASE_URL ?? "")) throw new Error("само пробната база");
    m = {
      db: await import("@/lib/db"),
      data: await import("./clients-data"),
      core: await import("./clients"),
      offering: await import("@/lib/booking/offering"),
    };
    const { clients, list } = await loadAll();
    bookings = list;
    oracle = byActivity(m.core.summarizeClients(clients, list, NOW));
  });

  it("страниците по 50 дават същите клиенти, числа и ред като сметката върху всички часове", async () => {
    const pages = await allPages("", null);
    expect(pages[0].total).toBe(oracle.length);
    expect(pages.map((p) => p.rows.length)).toEqual(
      Array.from({ length: Math.ceil(oracle.length / 50) }, (_, i) => Math.min(50, oracle.length - i * 50)),
    );
    expect(pages.flatMap((p) => p.rows).map(norm)).toEqual(oracle.map(norm));
  });

  it("търсенето е по всички клиенти, не по страницата", async () => {
    for (const q of ["зорница", "ИЗМИСЛЕНА", "0899 7", "+359887700012", "8877000", "няма такъв"]) {
      const want = m.core.filterClients(oracle, { query: q });
      const got = (await allPages(q, null)).flatMap((p) => p.rows);
      expect(got.map((r) => r.id), q).toEqual(want.map((r) => r.id));
    }
  });

  it("филтър по специалист заедно със страниците и търсенето", async () => {
    const first = await m.data.loadAdminClientsPage({ query: "", resourceId: null, page: 1, nowMs: NOW });
    expect(first.filterResources.length).toBeGreaterThan(1);
    for (const r of first.filterResources) {
      for (const q of ["", "измислена"]) {
        const want = m.core.filterClients(oracle, { query: q, resourceId: r.id });
        const got = (await allPages(q, r.id)).flatMap((p) => p.rows);
        expect(got.map(norm), `${r.name} ${q}`).toEqual(want.map(norm));
      }
    }
  });

  it("страница извън обхвата става последната", async () => {
    const p = await m.data.loadAdminClientsPage({ query: "", resourceId: null, page: 99, nowMs: NOW });
    expect(p.page).toBe(p.pages);
  });

  it("историята е само на този клиент, с цената като в оборота, най-новият час първи", async () => {
    for (const c of [oracle[0], oracle[60], oracle[oracle.length - 1]]) {
      const h = await m.data.loadClientHistory(c.id);
      const want = bookings.filter((b) => b.clientId === c.id).sort((a, b) => b.startMs - a.startMs);
      expect(h?.client.name).toBe(c.name);
      expect(h?.bookings).toEqual(want);
    }
    expect(await m.data.loadClientHistory("няма-такъв")).toBeNull();
  });
});
