import { describe, it, expect } from "vitest";
import { filterClients, matchesQuery, summarizeClients, type ClientBooking } from "./clients";

const NOW = Date.UTC(2026, 10, 25, 12);
const H = 3600_000;
const D = 24 * H;

function b(p: Partial<ClientBooking> & Pick<ClientBooking, "clientId" | "resourceId" | "startMs" | "status">): ClientBooking {
  return { id: Math.random().toString(36).slice(2), serviceName: "Услуга", price: 30, ...p };
}

const clients = [
  { id: "c1", name: "Мария Иванова", phone: "+359888123456" },
  { id: "c2", name: "Елена Петрова", phone: "+359877000111" },
  { id: "c3", name: "Без часове", phone: "+359899999999" },
];

const bookings: ClientBooking[] = [
  // c1: при двама специалисти
  b({ clientId: "c1", resourceId: "r1", startMs: NOW - 30 * D, status: "completed", price: 50 }),
  b({ clientId: "c1", resourceId: "r1", startMs: NOW - 10 * D, status: "confirmed", price: 40 }), // минал, неотбелязан: посещение
  b({ clientId: "c1", resourceId: "r2", startMs: NOW - 5 * D, status: "arrived", price: null }), // без цена
  b({ clientId: "c1", resourceId: "r2", startMs: NOW - 3 * D, status: "no_show", price: 25 }),
  b({ clientId: "c1", resourceId: "r1", startMs: NOW - 2 * D, status: "cancelled", price: 99 }),
  b({ clientId: "c1", resourceId: "r2", startMs: NOW + 9 * D, status: "confirmed" }),
  b({ clientId: "c1", resourceId: "r1", startMs: NOW + 2 * D, status: "pending" }),
  b({ clientId: "c1", resourceId: "r1", startMs: NOW + 1 * D, status: "cancelled" }), // отказан: не е следващ
  // c2: само бъдещ час
  b({ clientId: "c2", resourceId: "r2", startMs: NOW + 20 * D, status: "confirmed" }),
];

describe("summarizeClients", () => {
  const rows = summarizeClients(clients, bookings, NOW);
  const c1 = rows.find((r) => r.id === "c1")!;
  const c2 = rows.find((r) => r.id === "c2")!;

  it("само клиенти с час", () => {
    expect(rows.map((r) => r.id).sort()).toEqual(["c1", "c2"]);
  });

  it("посещения: минали, без отказани и неявили се", () => {
    expect(c1.visits).toBe(3);
    expect(c1.lastVisitMs).toBe(NOW - 5 * D);
  });

  it("похарчено: сбор от цените на посещенията; без цена се броят отделно", () => {
    expect(c1.spent).toBe(90);
    expect(c1.unpriced).toBe(1);
  });

  it("неявявания и следващ час (отказаният не е следващ)", () => {
    expect(c1.noShows).toBe(1);
    expect(c1.nextMs).toBe(NOW + 2 * D);
  });

  it("при двама специалисти излиза с двамата, първо този с повече часове", () => {
    expect(c1.resourceIds).toEqual(["r1", "r2"]);
  });

  it("клиент само с бъдещ час: 0 посещения, без последно", () => {
    expect(c2).toMatchObject({ visits: 0, lastVisitMs: null, spent: 0, nextMs: NOW + 20 * D, resourceIds: ["r2"] });
  });

  it("първо най-скорошният час", () => {
    expect(rows[0].id).toBe("c2");
  });
});

describe("търсене и филтър", () => {
  const row = { name: "Мария Иванова", phone: "+359888123456" };
  it("по име, без значение главни или малки", () => {
    expect(matchesQuery(row, "мария")).toBe(true);
    expect(matchesQuery(row, "ИВАН")).toBe(true);
    expect(matchesQuery(row, "Елена")).toBe(false);
  });
  it("по телефон във всеки запис", () => {
    expect(matchesQuery(row, "0888 123")).toBe(true);
    expect(matchesQuery(row, "+359888123456")).toBe(true);
    expect(matchesQuery(row, "123456")).toBe(true);
    expect(matchesQuery(row, "0877")).toBe(false);
  });
  it("филтър по специалист", () => {
    const rows = summarizeClients(clients, bookings, NOW);
    expect(filterClients(rows, { resourceId: "r1" }).map((r) => r.id)).toEqual(["c1"]);
    expect(filterClients(rows, { resourceId: "r2" }).map((r) => r.id).sort()).toEqual(["c1", "c2"]);
    expect(filterClients(rows, { resourceId: "r2", query: "елена" }).map((r) => r.id)).toEqual(["c2"]);
  });
});
