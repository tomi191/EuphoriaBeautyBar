import { beforeEach, describe, expect, it, vi } from "vitest";

// №8А: „готов" изпълнител пред клиентите, часовете на приключил в сводката (скритият си
// получава сводката). Базата е мок — нищо не се връзва с живата.
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

const offer = (resourceId: string, price: number) => ({
  resourceId,
  serviceItemId: "s1",
  price,
  priceMax: null,
  priceFrom: false,
});

beforeEach(() => {
  vi.clearAllMocks();
  m.cats.mockResolvedValue([{ id: "c1", slug: "frizorski-uslugi", title: "Коса", shortTitle: "Коса", icon: "scissors" }]);
  m.items.mockResolvedValue([
    { id: "s1", categoryId: "c1", name: "Подстригване", groupTitle: "Коса", price: 50, priceMax: null, priceFrom: false, currency: "€", duration: null, description: null },
  ]);
});

describe("готов изпълнител (т. 1)", () => {
  it("етикетът в админа казва какво липсва; работно време не се иска", () => {
    expect(notReadyLabel({ services: false })).toBe("Не е готов: липсват услуги");
    expect(notReadyLabel({ services: true })).toBeNull();
  });

  it("готов = своя активна услуга, видима в каталога; без свое работно време (ползва салонното)", async () => {
    m.offers.mockResolvedValue([offer("A", 40), { ...offer("B", 40), serviceItemId: "archived" }]);
    const r = await getReadiness(["A", "B", "D"]);
    expect(isReady(r.get("A"))).toBe(true); // няма нито един свой работен ден, пак е готов
    expect(r.get("B")).toEqual({ services: false }); // услугата му е скрита от каталога
    expect(r.get("D")).toEqual({ services: false }); // нов, нищо не е попълнил
    expect(m.hours).not.toHaveBeenCalled();
  });

  it("цените на неготов изпълнител не влизат в ценоразписа; щом отметне услуга, влизат сами", async () => {
    m.resources.mockResolvedValue([
      { id: "A", kind: "hair" },
      { id: "B", kind: "hair" },
    ]);
    m.offers.mockResolvedValue([offer("A", 40)]); // B още няма своя услуга
    let item = (await getServiceCatalog())[0].groups[0].items[0];
    expect(item.price).toBe(40);
    expect(item.priceMax).toBeUndefined();

    m.offers.mockResolvedValue([offer("A", 40), offer("B", 90)]); // B отметна услугата
    item = (await getServiceCatalog())[0].groups[0].items[0];
    expect(item.price).toBe(40);
    expect(item.priceMax).toBe(90);
  });
});

describe("вечерната сводка (т. 2)", () => {
  it("часовете на приключил отиват при собственика с бележка; скритият получава сводката си", async () => {
    const tomorrow = new Date(Date.now() + 24 * 3600000);
    m.resources.mockResolvedValue([
      { id: "A", name: "Ана", active: true, userId: "u1" },
      { id: "S", name: "Сия", active: false, userId: "u2" }, // скрита: работи
      { id: "M", name: "Мария", active: false, userId: null }, // приключила
    ]);
    m.bookings.mockResolvedValue([
      { resourceId: "A", startAt: tomorrow },
      { resourceId: "S", startAt: tomorrow },
      { resourceId: "M", startAt: tomorrow },
      { resourceId: "M", startAt: new Date(tomorrow.getTime() + 3600000) },
    ]);
    m.notifyResource.mockResolvedValue({ push: { sent: 1, failed: 0 }, telegram: false });
    m.tgAdmin.mockResolvedValue(true);
    m.opsAlert.mockResolvedValue(true);

    const res = await eveningDigest(new Request("http://localhost/api/cron/evening-digest"));
    const body = await res.json();

    expect(m.notifyResource).toHaveBeenCalledTimes(2);
    expect(m.notifyResource).toHaveBeenCalledWith("A", expect.anything());
    expect(m.notifyResource).toHaveBeenCalledWith("S", expect.anything());
    expect(body.inactive).toHaveLength(1);
    expect(body.inactive[0]).toContain("Мария (сътрудничеството е приключено): утре 2 часа");
    expect(body.inactiveDelivered).toBe(true);
    expect(m.tgAdmin.mock.calls[0][0]).toContain("сътрудничеството е приключено");
    expect(m.opsAlert).toHaveBeenCalledWith("Утрешни часове при приключил специалист", expect.any(Array));
  });

  it("без приключили с часове утре нищо допълнително не се праща", async () => {
    m.resources.mockResolvedValue([{ id: "A", name: "Ана", active: true, userId: "u1" }]);
    m.bookings.mockResolvedValue([{ resourceId: "A", startAt: new Date(Date.now() + 24 * 3600000) }]);
    m.notifyResource.mockResolvedValue({ push: { sent: 1, failed: 0 }, telegram: false });
    const body = await (await eveningDigest(new Request("http://localhost/x"))).json();
    expect(body.inactive).toEqual([]);
    expect(m.tgAdmin).not.toHaveBeenCalled();
    expect(m.opsAlert).not.toHaveBeenCalled();
  });
});
