import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { config } from "dotenv";

/**
 * Проба срещу пробната база (PROBA_DB=1): истинското четене на липсите и истинското пращане до
 * админ канала, с подменен Telegram (fetch към api.telegram.org се хваща, нищо не излиза).
 */
config({ path: ".env.local" });

const RUN = !!process.env.PROBA_DB;

describe.skipIf(!RUN)("Какво да попълниш: пробна база + подменен Telegram", () => {
  const calls: { method: string; body: Record<string, unknown> }[] = [];
  const realFetch = globalThis.fetch;

  beforeAll(() => {
    const url = process.env.DATABASE_URL ?? "";
    if (!/127\.0\.0\.1|localhost/.test(url)) throw new Error("Пробата иска локална база");
    process.env.TELEGRAM_BOT_TOKEN = "fake-token";
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const u = String(input instanceof Request ? input.url : input);
      if (u.includes("api.telegram.org")) {
        calls.push({ method: u.split("/").pop()!, body: JSON.parse(String(init?.body ?? "{}")) });
        return new Response(JSON.stringify({ ok: true, result: { message_id: 1 } }), { status: 200 });
      }
      return realFetch(input, init);
    }) as typeof fetch;
  });
  afterAll(() => {
    globalThis.fetch = realFetch;
  });

  it("в 10:00 с липси праща едно съобщение до админ канала; извън 10:00 нищо", async () => {
    const { loadPopalniData, runPopalniCron } = await import("./popalni");
    const { sendTelegramToAdmin } = await import("@/lib/telegram");
    const deps = { load: loadPopalniData, send: sendTelegramToAdmin, siteUrl: "https://www.euphoriabeauty.eu" };

    const off = await runPopalniCron(new Date("2026-11-25T07:00:00Z"), deps);
    expect(off.reason).toBe("not-10");
    expect(calls).toHaveLength(0);

    const r = await runPopalniCron(new Date("2026-11-25T08:00:00Z"), deps);
    console.log("[proba] cron:", JSON.stringify(r));
    console.log("[proba] telegram:", JSON.stringify(calls));
    if (r.rows === 0) {
      expect(calls).toHaveLength(0);
    } else {
      expect(calls).toHaveLength(1);
      expect(calls[0].method).toBe("sendMessage");
      const kb = calls[0].body.reply_markup as { inline_keyboard: { text: string; url: string }[][] };
      expect(kb.inline_keyboard).toHaveLength(r.rows);
      for (const row of kb.inline_keyboard) expect(row[0].url).toMatch(/^https:\/\/www\.euphoriabeauty\.eu\/(admin|staff)\//);
    }
  });
});
