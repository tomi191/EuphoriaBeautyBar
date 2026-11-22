import { beforeEach, describe, expect, it, vi } from "vitest";

// Изключен изпълнител: губи /staff, сесиите и известията му се чистят, онлайн записът към
// него се отказва. Базата е мок — нищо не се връзва с живата.
const m = vi.hoisted(() => ({
  getSession: vi.fn(),
  resourcesFindFirst: vi.fn(),
  clientsFindMany: vi.fn(),
  del: vi.fn(),
  deleteWhere: vi.fn(),
  upd: vi.fn(),
  updateSet: vi.fn(),
  updateWhere: vi.fn(),
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
        clients: { findMany: m.clientsFindMany },
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

import { schema } from "@/lib/db";
import { requireStaff } from "@/lib/actions/auth-guard";
import { updateResource, deleteResource } from "@/lib/actions/resources";
import { createPublicBooking } from "@/lib/actions/public-booking";

const admin = { user: { id: "admin-1", role: "admin" } };
const staffSession = { user: { id: "u1", role: "staff" } };

beforeEach(() => {
  vi.clearAllMocks();
  m.deleteWhere.mockResolvedValue(undefined);
  m.updateWhere.mockResolvedValue(undefined);
});

describe("requireStaff", () => {
  it("пренасочва изключен изпълнител към входа с ?inactive=1", async () => {
    m.getSession.mockResolvedValue(staffSession);
    m.resourcesFindFirst.mockResolvedValue({ id: "r1", userId: "u1", active: false });
    await expect(requireStaff()).rejects.toThrow("REDIRECT:/staff/login?inactive=1");
  });

  it("пуска активен изпълнител", async () => {
    m.getSession.mockResolvedValue(staffSession);
    m.resourcesFindFirst.mockResolvedValue({ id: "r1", userId: "u1", active: true });
    const { resource } = await requireStaff();
    expect(resource.id).toBe("r1");
    expect(m.redirect).not.toHaveBeenCalled();
  });
});

describe("изключване от админа", () => {
  const input = { name: "Ива", kind: "nails" as const, active: false };

  it("updateResource(active:false) трие сесиите, разкача Telegram и трие push абонаментите", async () => {
    m.getSession.mockResolvedValue(admin);
    m.resourcesFindFirst.mockResolvedValue({ id: "r1", userId: "u1", active: false });
    await updateResource("r1", input);
    expect(m.del).toHaveBeenCalledWith(schema.session);
    expect(m.del).toHaveBeenCalledWith(schema.pushSubscriptions);
    expect(m.updateSet).toHaveBeenCalledWith(schema.resources, { telegramChatId: null, telegramLinkToken: null });
  });

  it("без вход (userId) не трие чужди сесии, но пак чисти известията", async () => {
    m.getSession.mockResolvedValue(admin);
    m.resourcesFindFirst.mockResolvedValue({ id: "r1", userId: null, active: false });
    await updateResource("r1", input);
    expect(m.del).not.toHaveBeenCalledWith(schema.session);
    expect(m.del).toHaveBeenCalledWith(schema.pushSubscriptions);
  });

  it("updateResource(active:true) не пипа сесии и известия (може пак да влезе и да свърже Telegram)", async () => {
    m.getSession.mockResolvedValue(admin);
    await updateResource("r1", { ...input, active: true });
    expect(m.del).not.toHaveBeenCalled();
    expect(m.updateSet).toHaveBeenCalledTimes(1); // само самото обновяване на изпълнителя
    const [, values] = m.updateSet.mock.calls[0];
    expect(values).toMatchObject({ active: true });
    expect(values).not.toHaveProperty("telegramChatId");
  });

  it("deleteResource с часове (тихо деактивиране) също отнема достъпа", async () => {
    m.getSession.mockResolvedValue(admin);
    m.deleteWhere.mockRejectedValueOnce(new Error("FK restrict"));
    m.resourcesFindFirst.mockResolvedValue({ id: "r1", userId: "u1", active: false });
    await deleteResource("r1");
    expect(m.updateSet).toHaveBeenCalledWith(schema.resources, expect.objectContaining({ active: false }));
    expect(m.del).toHaveBeenCalledWith(schema.session);
    expect(m.del).toHaveBeenCalledWith(schema.pushSubscriptions);
    expect(m.updateSet).toHaveBeenCalledWith(schema.resources, { telegramChatId: null, telegramLinkToken: null });
  });

  it("само админ може да изключва", async () => {
    m.getSession.mockResolvedValue(staffSession);
    await expect(updateResource("r1", input)).rejects.toThrow("REDIRECT:/admin/login");
    expect(m.del).not.toHaveBeenCalled();
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

  it("при активен изпълнител продължава към обичайните проверки", async () => {
    m.resourcesFindFirst.mockResolvedValue({ active: true });
    m.clientsFindMany.mockRejectedValue(new Error("STOP")); // спираме веднага след новата проверка
    await expect(createPublicBooking(booking)).rejects.toThrow("STOP");
    expect(m.clientsFindMany).toHaveBeenCalledTimes(1);
  });
});
