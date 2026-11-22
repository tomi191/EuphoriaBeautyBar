import { beforeEach, describe, expect, it, vi } from "vitest";

// Скрит изпълнител (active=false) пази входа и известията; приключил (endCooperation) губи
// входа, сесиите, Telegram и push; онлайн записът и към двата се отказва. Базата е мок.
const m = vi.hoisted(() => ({
  getSession: vi.fn(),
  resourcesFindFirst: vi.fn(),
  userFindFirst: vi.fn(),
  clientsFindMany: vi.fn(),
  bookingsFindMany: vi.fn(),
  offersFindMany: vi.fn(),
  itemsFindMany: vi.fn(),
  hoursFindMany: vi.fn(),
  del: vi.fn(),
  deleteWhere: vi.fn(),
  upd: vi.fn(),
  updateSet: vi.fn(),
  updateWhere: vi.fn(),
  release: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock("@/lib/db", async () => {
  const schema = await vi.importActual<typeof import("@/lib/db/schema")>("@/lib/db/schema");
  return {
    schema,
    db: {
      query: {
        resources: { findFirst: m.resourcesFindFirst },
        user: { findFirst: m.userFindFirst },
        clients: { findMany: m.clientsFindMany },
        bookings: { findMany: m.bookingsFindMany },
        resourceServices: { findMany: m.offersFindMany },
        serviceItems: { findMany: m.itemsFindMany },
        resourceWorkingHours: { findMany: m.hoursFindMany },
      },
      delete: (t: unknown) => {
        m.del(t);
        return { where: m.deleteWhere };
      },
      update: (t: unknown) => {
        m.upd(t);
        return {
          set: (v: unknown) => {
            m.updateSet(t, v);
            return { where: m.updateWhere };
          },
        };
      },
    },
  };
});
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: m.getSession } } }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({ redirect: m.redirect }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/email/booking", () => ({
  sendBookingConfirmation: vi.fn(),
  sendSalonNotification: vi.fn(),
  formatWhen: vi.fn(),
}));
vi.mock("@/lib/notify", () => ({ notifyResource: vi.fn(), notifyAdmin: vi.fn() }));
vi.mock("@/lib/rental/release", () => ({ releaseListingsFilledBy: m.release }));

import { schema } from "@/lib/db";
import { requireStaff } from "@/lib/actions/auth-guard";
import { updateResource, deleteResource, endCooperation } from "@/lib/actions/resources";
import { createPublicBooking } from "@/lib/actions/public-booking";

const admin = { user: { id: "admin-1", role: "admin" } };
const staffSession = { user: { id: "u1", role: "staff" } };

beforeEach(() => {
  vi.clearAllMocks();
  m.deleteWhere.mockResolvedValue(undefined);
  m.updateWhere.mockResolvedValue(undefined);
  m.release.mockResolvedValue([]);
  m.bookingsFindMany.mockResolvedValue([]);
  // По подразбиране r1 е „готов": своя активна услуга (видима).
  m.offersFindMany.mockResolvedValue([{ resourceId: "r1", serviceItemId: "s1" }]);
  m.itemsFindMany.mockResolvedValue([{ id: "s1" }]);
  m.hoursFindMany.mockResolvedValue([{ resourceId: "r1", openTime: "09:00", closeTime: "18:00" }]);
});

describe("requireStaff", () => {
  it("пуска скрит изпълнител (не приема онлайн записи, но работи)", async () => {
    m.getSession.mockResolvedValue(staffSession);
    m.resourcesFindFirst.mockResolvedValue({ id: "r1", userId: "u1", active: false });
    const { resource } = await requireStaff();
    expect(resource.id).toBe("r1");
    expect(m.redirect).not.toHaveBeenCalled();
  });

  it("пуска активен изпълнител", async () => {
    m.getSession.mockResolvedValue(staffSession);
    m.resourcesFindFirst.mockResolvedValue({ id: "r1", userId: "u1", active: true });
    const { resource } = await requireStaff();
    expect(resource.id).toBe("r1");
    expect(m.redirect).not.toHaveBeenCalled();
  });

  it("приключил (входът е откачен) не стига до приложението, дори с кеширана сесия", async () => {
    m.getSession.mockResolvedValue(staffSession);
    m.resourcesFindFirst.mockResolvedValue(undefined);
    await expect(requireStaff()).rejects.toThrow("REDIRECT:/staff/login?no_resource=1");
  });
});

describe("скриване от админа (превключвателят)", () => {
  const input = { name: "Ива", kind: "nails" as const, active: false };

  it("updateResource(active:false) не пипа сесии, Telegram и push", async () => {
    m.getSession.mockResolvedValue(admin);
    await updateResource("r1", input);
    expect(m.del).not.toHaveBeenCalled();
    expect(m.updateSet).toHaveBeenCalledTimes(1); // само самото обновяване на изпълнителя
    const [, values] = m.updateSet.mock.calls[0];
    expect(values).toMatchObject({ active: false });
    expect(values).not.toHaveProperty("telegramChatId");
    expect(values).not.toHaveProperty("userId");
  });

  it("само админ може да скрива", async () => {
    m.getSession.mockResolvedValue(staffSession);
    await expect(updateResource("r1", input)).rejects.toThrow("REDIRECT:/admin/login");
    expect(m.updateSet).not.toHaveBeenCalled();
  });
});

describe("приключване на сътрудничеството", () => {
  it("скрива, откача входа, разкача Telegram, трие push, сесии, парола и самия вход", async () => {
    m.getSession.mockResolvedValue(admin);
    m.resourcesFindFirst.mockResolvedValue({ id: "r1", userId: "u1", active: true });
    m.userFindFirst.mockResolvedValue({ role: "staff" });
    await expect(endCooperation("r1")).resolves.toEqual({ ok: true, futureBookings: 0, pausedListings: [] });
    expect(m.updateSet).toHaveBeenCalledWith(
      schema.resources,
      expect.objectContaining({ active: false, userId: null, telegramChatId: null, telegramLinkToken: null }),
    );
    for (const t of [schema.pushSubscriptions, schema.session, schema.passkey, schema.account, schema.user]) {
      expect(m.del).toHaveBeenCalledWith(t);
    }
  });

  it("часовете не се пипат; връща колко бъдещи има", async () => {
    m.getSession.mockResolvedValue(admin);
    m.resourcesFindFirst.mockResolvedValue({ id: "r1", userId: "u1", active: false });
    m.userFindFirst.mockResolvedValue({ role: "staff" });
    m.bookingsFindMany.mockResolvedValue([{ id: "b1" }, { id: "b2" }, { id: "b3" }]);
    await expect(endCooperation("r1")).resolves.toEqual({ ok: true, futureBookings: 3, pausedListings: [] });
    expect(m.del).not.toHaveBeenCalledWith(schema.bookings);
    expect(m.updateSet).not.toHaveBeenCalledWith(schema.bookings, expect.anything());
  });

  it("заетото от него място става «спряно» и се връща, за да го предложим на Снежана", async () => {
    m.getSession.mockResolvedValue(admin);
    m.resourcesFindFirst.mockResolvedValue({ id: "r1", userId: null, active: true });
    m.release.mockResolvedValue([{ id: "p1", title: "Място под наем за маникюрист", slug: "myasto-pod-naem-za-manikyurist" }]);
    const res = await endCooperation("r1");
    expect(m.release).toHaveBeenCalledWith("r1");
    expect(res).toMatchObject({ ok: true, pausedListings: [{ id: "p1" }] });
  });

  it("изпълнител, който не е намерен: мястото не се пипа", async () => {
    m.getSession.mockResolvedValue(admin);
    m.resourcesFindFirst.mockResolvedValue(undefined);
    await expect(endCooperation("rX")).resolves.toMatchObject({ ok: false });
    expect(m.release).not.toHaveBeenCalled();
  });

  it("входът на админ (Снежана като изпълнител) само се откача, не се трие", async () => {
    m.getSession.mockResolvedValue(admin);
    m.resourcesFindFirst.mockResolvedValue({ id: "r1", userId: "admin-1", active: true });
    m.userFindFirst.mockResolvedValue({ role: "admin" });
    await endCooperation("r1");
    expect(m.updateSet).toHaveBeenCalledWith(schema.resources, expect.objectContaining({ userId: null }));
    expect(m.del).not.toHaveBeenCalledWith(schema.user);
    expect(m.del).not.toHaveBeenCalledWith(schema.session);
  });

  it("изпълнител без вход: само скрива и чисти известията", async () => {
    m.getSession.mockResolvedValue(admin);
    m.resourcesFindFirst.mockResolvedValue({ id: "r1", userId: null, active: true });
    await endCooperation("r1");
    expect(m.del).toHaveBeenCalledWith(schema.pushSubscriptions);
    expect(m.del).not.toHaveBeenCalledWith(schema.user);
    expect(m.userFindFirst).not.toHaveBeenCalled();
  });

  it("deleteResource с часове приключва сътрудничеството вместо да трие", async () => {
    m.getSession.mockResolvedValue(admin);
    m.deleteWhere.mockRejectedValueOnce(new Error("FK restrict"));
    m.resourcesFindFirst.mockResolvedValue({ id: "r1", userId: "u1", active: true });
    m.userFindFirst.mockResolvedValue({ role: "staff" });
    await deleteResource("r1");
    expect(m.updateSet).toHaveBeenCalledWith(schema.resources, expect.objectContaining({ active: false, userId: null }));
    expect(m.del).toHaveBeenCalledWith(schema.user);
  });

  it("само админ може да приключва", async () => {
    m.getSession.mockResolvedValue(staffSession);
    await expect(endCooperation("r1")).rejects.toThrow("REDIRECT:/admin/login");
    expect(m.del).not.toHaveBeenCalled();
    expect(m.updateSet).not.toHaveBeenCalled();
  });
});

describe("createPublicBooking", () => {
  const booking = {
    resourceId: "r1",
    serviceItemId: "s1",
    serviceName: "Маникюр",
    durationMin: 60,
    bufferMin: 10,
    startAt: "2026-12-01T09:00:00.000Z",
    clientName: "Тест Клиент",
    clientPhone: "0888123456",
    clientEmail: "test@example.com",
    consentLate: true as const,
  };

  it("отказва запис към изключен изпълнител, преди да пипне базата", async () => {
    m.resourcesFindFirst.mockResolvedValue({ active: false });
    const res = await createPublicBooking(booking);
    expect(res.ok).toBe(false);
    expect(res).toMatchObject({ error: expect.stringContaining("вече не приема онлайн записи") });
    expect(m.clientsFindMany).not.toHaveBeenCalled();
  });

  it("отказва запис към несъществуващ изпълнител", async () => {
    m.resourcesFindFirst.mockResolvedValue(undefined);
    const res = await createPublicBooking(booking);
    expect(res.ok).toBe(false);
    expect(m.clientsFindMany).not.toHaveBeenCalled();
  });

  it("отказва запис към активен, но неготов изпълнител (без своя услуга)", async () => {
    m.resourcesFindFirst.mockResolvedValue({ active: true });
    m.offersFindMany.mockResolvedValue([]);
    const res = await createPublicBooking(booking);
    expect(res).toMatchObject({ ok: false, error: expect.stringContaining("още не приема онлайн записи") });
    expect(m.clientsFindMany).not.toHaveBeenCalled();
  });

  it("активен изпълнител без свое работно време се записва (часовете идват от салона)", async () => {
    m.resourcesFindFirst.mockResolvedValue({ active: true });
    m.hoursFindMany.mockResolvedValue([]);
    m.clientsFindMany.mockRejectedValue(new Error("STOP")); // мина проверката «готов»
    await expect(createPublicBooking(booking)).rejects.toThrow("STOP");
  });

  it("при активен изпълнител продължава към обичайните проверки", async () => {
    m.resourcesFindFirst.mockResolvedValue({ active: true });
    m.clientsFindMany.mockRejectedValue(new Error("STOP")); // спираме веднага след новата проверка
    await expect(createPublicBooking(booking)).rejects.toThrow("STOP");
    expect(m.clientsFindMany).toHaveBeenCalledTimes(1);
  });
});
