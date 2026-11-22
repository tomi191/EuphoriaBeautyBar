import { beforeEach, describe, expect, it, vi } from "vitest";

// Изключен изпълнител не получава известия (push и Telegram) и не вижда /today.
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
  it("не праща нищо на изключен изпълнител", async () => {
    m.resourcesFindFirst.mockResolvedValue({ active: false });
    const res = await notifyResource("r1", { title: "Нов час", body: "утре 10:00" });
    expect(res).toEqual({ push: { sent: 0, failed: 0 }, telegram: false });
    expect(m.sendPush).not.toHaveBeenCalled();
    expect(m.sendTgToResource).not.toHaveBeenCalled();
  });

  it("праща по двата канала на активен изпълнител", async () => {
    m.resourcesFindFirst.mockResolvedValue({ active: true });
    const res = await notifyResource("r1", { title: "Нов час", body: "утре 10:00" });
    expect(res).toEqual({ push: { sent: 1, failed: 0 }, telegram: true });
    expect(m.sendPush).toHaveBeenCalledTimes(1);
    expect(m.sendTgToResource).toHaveBeenCalledTimes(1);
  });
});

describe("findResourceByChatId (/today и бутоните по дни)", () => {
  type Row = { id: string; active: boolean; telegramChatId: string | null };
  type Pred = (row: Row) => boolean;
  // Малка «база» в паметта: изпълнява where условието на заявката върху редовете.
  function withRows(rows: Row[]) {
    m.resourcesFindFirst.mockImplementation(
      async ({ where }: { where: (cols: Record<string, keyof Row>, ops: unknown) => Pred }) => {
        const cols = { id: "id", active: "active", telegramChatId: "telegramChatId" } as const;
        const ops = {
          eq: (col: keyof Row, v: unknown): Pred => (row) => row[col] === v,
          and: (...ps: Pred[]): Pred => (row) => ps.every((p) => p(row)),
        };
        return rows.find(where(cols, ops));
      },
    );
  }

  it("не връща изключен изпълнител, дори chat-ът да е още свързан", async () => {
    withRows([{ id: "r1", active: false, telegramChatId: "42" }]);
    expect(await findResourceByChatId(42)).toBeUndefined();
  });

  it("връща активния, когато същият chat е останал и на стар изключен запис", async () => {
    withRows([
      { id: "old", active: false, telegramChatId: "42" },
      { id: "new", active: true, telegramChatId: "42" },
    ]);
    expect((await findResourceByChatId("42"))?.id).toBe("new");
  });
});
