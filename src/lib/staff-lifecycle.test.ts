import { beforeEach, describe, expect, it, vi } from "vitest";

// №8А част 2: „готов" изпълнител пред клиентите, часовете на изключен в сводката,
// без сесия при вход на изключен. Базата е мок — нищо не се връзва с живата.
const m = vi.hoisted(() => ({
  cats: vi.fn(),
  items: vi.fn(),
  offers: vi.fn(),
  resources: vi.fn(),
  hours: vi.fn(),
  bookings: vi.fn(),
  resourceFindFirst: vi.fn(),
  userFindFirst: vi.fn(),
  notifyResource: vi.fn(),
  tgAdmin: vi.fn(),
  opsAlert: vi.fn(),
}));

vi.mock("@/lib/db", async () => {
  const schema = await vi.importActual<typeof import("@/lib/db/schema")>("@/lib/db/schema");
  return {
    schema,
    db: {
      query: {
        serviceCategories: { findMany: m.cats },
        serviceItems: { findMany: m.items },
        resourceServices: { findMany: m.offers },
        resources: { findMany: m.resources, findFirst: m.resourceFindFirst },
        resourceWorkingHours: { findMany: m.hours },
        bookings: { findMany: m.bookings },
        user: { findFirst: m.userFindFirst },
      },
    },
  };
});
vi.mock("@/lib/cron-auth", () => ({ authorizeCron: () => true }));
vi.mock("@/lib/notify", () => ({ notifyResource: m.notifyResource }));
vi.mock("@/lib/telegram", () => ({ sendTelegramToAdmin: m.tgAdmin }));
vi.mock("@/lib/email/booking", () => ({ sendOpsAlert: m.opsAlert }));

import { getReadiness, isReady, notReadyLabel } from "@/lib/booking/readiness";
import { getServiceCatalog } from "@/lib/data/service-catalog";
import { GET as eveningDigest } from "@/app/api/cron/evening-digest/route";
import { blockInactiveStaffSession, STAFF_INACTIVE } from "@/lib/staff-login-guard";

const offer = (resourceId: string, price: number) => ({
  resourceId,
  serviceItemId: "s1",
  price,
  priceMax: null,
  priceFrom: false,
});
const open = (resourceId: string) => ({ resourceId, openTime: "09:00", closeTime: "18:00" });

beforeEach(() => {
  vi.clearAllMocks();
  m.cats.mockResolvedValue([{ id: "c1", slug: "frizorski-uslugi", title: "Коса", shortTitle: "Коса", icon: "scissors" }]);
  m.items.mockResolvedValue([
    { id: "s1", categoryId: "c1", name: "Подстригване", groupTitle: "Коса", price: 50, priceMax: null, priceFrom: false, currency: "€", duration: null, description: null },
  ]);
});

describe("готов изпълнител (т. 1)", () => {
  it("етикетите в админа казват какво липсва", () => {
    expect(notReadyLabel({ services: false, hours: true })).toBe("Не е готов: липсват услуги");
    expect(notReadyLabel({ services: true, hours: false })).toBe("Не е готов: липсва работно време");
    expect(notReadyLabel({ services: false, hours: false })).toBe("Не е готов: липсват услуги и работно време");
    expect(notReadyLabel({ services: true, hours: true })).toBeNull();
  });

  it("готов = своя активна услуга, видима в каталога + поне един работен ден с часове", async () => {
    m.offers.mockResolvedValue([offer("A", 40), { ...offer("B", 40), serviceItemId: "archived" }, offer("C", 40)]);
    m.hours.mockResolvedValue([open("A"), open("B"), { resourceId: "C", openTime: null, closeTime: null }]);
    const r = await getReadiness(["A", "B", "C", "D"]);
    expect(isReady(r.get("A"))).toBe(true);
    expect(r.get("B")).toEqual({ services: false, hours: true }); // услугата му е скрита от каталога
    expect(r.get("C")).toEqual({ services: true, hours: false }); // ден без часове не е работен
    expect(r.get("D")).toEqual({ services: false, hours: false }); // нов, нищо не е попълнил
  });

  it("цените на неготов изпълнител не влизат в ценоразписа; щом е готов, влизат сами", async () => {
    m.resources.mockResolvedValue([
      { id: "A", kind: "hair" },
      { id: "B", kind: "hair" },
    ]);
    m.offers.mockResolvedValue([offer("A", 40), offer("B", 90)]);
    m.hours.mockResolvedValue([open("A")]); // B още няма работно време
    let item = (await getServiceCatalog())[0].groups[0].items[0];
    expect(item.price).toBe(40);
    expect(item.priceMax).toBeUndefined();

    m.hours.mockResolvedValue([open("A"), open("B")]); // B попълни работното време
    item = (await getServiceCatalog())[0].groups[0].items[0];
    expect(item.price).toBe(40);
    expect(item.priceMax).toBe(90);
  });
});

describe("вечерната сводка (т. 2)", () => {
  it("часовете на изключен изпълнител отиват при собственика с бележка, без известие до него", async () => {
    const tomorrow = new Date(Date.now() + 24 * 3600000);
    m.resources.mockResolvedValue([
      { id: "A", name: "Ана", active: true },
      { id: "M", name: "Мария", active: false },
    ]);
    m.bookings.mockResolvedValue([
      { resourceId: "A", startAt: tomorrow },
      { resourceId: "M", startAt: tomorrow },
      { resourceId: "M", startAt: new Date(tomorrow.getTime() + 3600000) },
    ]);
    m.notifyResource.mockResolvedValue({ push: { sent: 1, failed: 0 }, telegram: false });
    m.tgAdmin.mockResolvedValue(true);
    m.opsAlert.mockResolvedValue(true);

    const res = await eveningDigest(new Request("http://localhost/api/cron/evening-digest"));
    const body = await res.json();

    expect(m.notifyResource).toHaveBeenCalledTimes(1);
    expect(m.notifyResource).toHaveBeenCalledWith("A", expect.anything());
    expect(body.inactive).toHaveLength(1);
    expect(body.inactive[0]).toContain("Мария (специалистът е изключен): утре 2 часа");
    expect(body.inactiveDelivered).toBe(true);
    expect(m.tgAdmin.mock.calls[0][0]).toContain("специалистът е изключен");
    expect(m.opsAlert).toHaveBeenCalledWith("Утрешни часове при изключен специалист", expect.any(Array));
  });

  it("без изключени с часове утре нищо допълнително не се праща", async () => {
    m.resources.mockResolvedValue([{ id: "A", name: "Ана", active: true }]);
    m.bookings.mockResolvedValue([{ resourceId: "A", startAt: new Date(Date.now() + 24 * 3600000) }]);
    m.notifyResource.mockResolvedValue({ push: { sent: 1, failed: 0 }, telegram: false });
    const body = await (await eveningDigest(new Request("http://localhost/x"))).json();
    expect(body.inactive).toEqual([]);
    expect(m.tgAdmin).not.toHaveBeenCalled();
    expect(m.opsAlert).not.toHaveBeenCalled();
  });
});

describe("вход на изключен (т. 3)", () => {
  it("изключен специалист не получава сесия", async () => {
    m.resourceFindFirst.mockResolvedValue({ active: false });
    m.userFindFirst.mockResolvedValue({ role: "staff" });
    await expect(blockInactiveStaffSession("u1")).rejects.toMatchObject({ body: { code: STAFF_INACTIVE } });
  });

  it("активен специалист, админ (и да е изключен като изпълнител) и потребител без изпълнител минават", async () => {
    m.resourceFindFirst.mockResolvedValue({ active: true });
    await expect(blockInactiveStaffSession("u1")).resolves.toBeUndefined();
    m.resourceFindFirst.mockResolvedValue({ active: false });
    m.userFindFirst.mockResolvedValue({ role: "admin" });
    await expect(blockInactiveStaffSession("admin")).resolves.toBeUndefined();
    m.resourceFindFirst.mockResolvedValue(undefined);
    await expect(blockInactiveStaffSession("x")).resolves.toBeUndefined();
  });
});
