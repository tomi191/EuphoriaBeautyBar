import { beforeEach, describe, expect, it, vi } from "vitest";

// Приключил изпълнител не получава известия (push и Telegram) и не вижда /today; скритият получава и вижда.
const m = vi.hoisted(() => ({
  resourcesFindFirst: vi.fn(),
  sendPush: vi.fn(),
  sendTgToResource: vi.fn(),
}));

vi.mock("@/lib/db", async () => {
  const schema = await vi.importActual<typeof import("@/lib/db/schema")>("@/lib/db/schema");
  return { schema, db: { query: { resources: { findFirst: m.resourcesFindFirst } } } };
});
vi.mock("@/lib/push", () => ({ sendPushToResource: m.sendPush }));
vi.mock("@/lib/telegram", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/telegram")>()),
  sendTelegramToResource: m.sendTgToResource,
}));

import { notifyResource } from "@/lib/notify";
import { findResourceByChatId } from "@/lib/telegram";

beforeEach(() => {
  vi.clearAllMocks();
  m.sendPush.mockResolvedValue({ sent: 1, failed: 0 });
  m.sendTgToResource.mockResolvedValue(true);
});

describe("notifyResource", () => {
  it("не праща нищо на приключил изпълнител (скрит и без вход)", async () => {
    m.resourcesFindFirst.mockResolvedValue({ active: false, userId: null });
    const res = await notifyResource("r1", { title: "Нов час", body: "утре 10:00" });
    expect(res).toEqual({ push: { sent: 0, failed: 0 }, telegram: false });
    expect(m.sendPush).not.toHaveBeenCalled();
    expect(m.sendTgToResource).not.toHaveBeenCalled();
  });

  it("праща по двата канала на скрит изпълнител (работи, само не приема онлайн записи)", async () => {
    m.resourcesFindFirst.mockResolvedValue({ active: false, userId: "u1" });
    const res = await notifyResource("r1", { title: "Клиент отказа час", body: "утре 10:00" });
    expect(res).toEqual({ push: { sent: 1, failed: 0 }, telegram: true });
  });

  it("праща по двата канала на активен изпълнител", async () => {
    m.resourcesFindFirst.mockResolvedValue({ active: true, userId: "u1" });
    const res = await notifyResource("r1", { title: "Нов час", body: "утре 10:00" });
    expect(res).toEqual({ push: { sent: 1, failed: 0 }, telegram: true });
    expect(m.sendPush).toHaveBeenCalledTimes(1);
    expect(m.sendTgToResource).toHaveBeenCalledTimes(1);
  });
});

describe("findResourceByChatId (/today и бутоните по дни)", () => {
  type Row = { id: string; active: boolean; userId: string | null; telegramChatId: string | null };
  type Pred = (row: Row) => boolean;
  // Малка «база» в паметта: изпълнява where условието на заявката върху редовете.
  function withRows(rows: Row[]) {
    m.resourcesFindFirst.mockImplementation(
      async ({ where }: { where: (cols: Record<string, keyof Row>, ops: unknown) => Pred }) => {
        const cols = { id: "id", active: "active", userId: "userId", telegramChatId: "telegramChatId" } as const;
        const ops = {
          eq: (col: keyof Row, v: unknown): Pred => (row) => row[col] === v,
          isNotNull: (col: keyof Row): Pred => (row) => row[col] !== null,
          and: (...ps: Pred[]): Pred => (row) => ps.every((p) => p(row)),
          or: (...ps: Pred[]): Pred => (row) => ps.some((p) => p(row)),
        };
        return rows.find(where(cols, ops));
      },
    );
  }

  it("не връща приключил изпълнител, дори chat-ът да е останал", async () => {
    withRows([{ id: "r1", active: false, userId: null, telegramChatId: "42" }]);
    expect(await findResourceByChatId(42)).toBeUndefined();
  });

  it("връща скрит изпълнител: вижда графика си", async () => {
    withRows([{ id: "r1", active: false, userId: "u1", telegramChatId: "42" }]);
    expect((await findResourceByChatId(42))?.id).toBe("r1");
  });

  it("връща активния, когато същият chat е останал и на стар приключил запис", async () => {
    withRows([
      { id: "old", active: false, userId: null, telegramChatId: "42" },
      { id: "new", active: true, userId: "u2", telegramChatId: "42" },
    ]);
    expect((await findResourceByChatId("42"))?.id).toBe("new");
  });
});
