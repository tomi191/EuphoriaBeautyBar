import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {}, schema: {} }));

import { sendTelegram } from "./telegram";

describe("Telegram: бавен отговор не задържа заявката", () => {
  const oldToken = process.env.TELEGRAM_BOT_TOKEN;
  afterEach(() => {
    process.env.TELEGRAM_BOT_TOKEN = oldToken;
    vi.restoreAllMocks();
  });

  it("всяка заявка има таймаут, а изтеклата връща false, без да хвърля", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "proba-fake-token";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    let signal: AbortSignal | undefined;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
      signal = init?.signal ?? undefined;
      throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
    });
    expect(await sendTelegram("proba-chat", "текст")).toBe(false);
    expect(signal).toBeInstanceOf(AbortSignal);
    expect(warn).toHaveBeenCalled();
  });
});
