import { beforeEach, describe, expect, it, vi } from "vitest";

const calls: string[] = [];
let updateRows: unknown[] = [];
let fail = false;
vi.mock("@/lib/db", () => ({
  db: {
    execute: vi.fn(async (q: { queryChunks?: unknown[] }) => {
      if (fail) throw new Error("база");
      const text = JSON.stringify(q.queryChunks ?? q);
      calls.push(text.includes("UPDATE call_clicks") ? "update" : text.includes("INSERT INTO call_clicks") ? "insert" : "?");
      return text.includes("UPDATE call_clicks") ? updateRows : [];
    }),
  },
}));

const { POST } = await import("./route");

function req(body: unknown, headers: Record<string, string> = { "sec-fetch-site": "same-origin" }) {
  return new Request("http://localhost:3181/api/call-click", {
    method: "POST",
    headers: { "content-type": "text/plain;charset=UTF-8", "x-forwarded-for": `10.0.0.${Math.floor(Math.random() * 250)}`, ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  calls.length = 0;
  updateRows = [];
  fail = false;
});

describe("POST /api/call-click", () => {
  it("нов ред: опит за обновяване, после добавяне; 204", async () => {
    const res = await POST(req({ page: "/", kind: "tel", spot: "header" }));
    expect(res.status).toBe(204);
    expect(calls).toEqual(["update", "insert"]);
  });
  it("съществуващ ред: само обновяване", async () => {
    updateRows = [{ "?column?": 1 }];
    const res = await POST(req({ page: "/contacts", kind: "viber", spot: "page" }));
    expect(res.status).toBe(204);
    expect(calls).toEqual(["update"]);
  });
  it("от чужд сайт: 403 без запис", async () => {
    const res = await POST(req({ page: "/", kind: "tel", spot: "header" }, { "sec-fetch-site": "cross-site" }));
    expect(res.status).toBe(403);
    const res2 = await POST(req({ page: "/", kind: "tel", spot: "header" }, { origin: "https://evil.example" }));
    expect(res2.status).toBe(403);
    expect(calls).toEqual([]);
  });
  it("лошо тяло: 400 без запис", async () => {
    expect((await POST(req("не е json"))).status).toBe(400);
    expect((await POST(req({ page: "/", kind: "sms", spot: "header" }))).status).toBe(400);
    expect(calls).toEqual([]);
  });
  it("голямо тяло: 413", async () => {
    expect((await POST(req({ page: "/", kind: "tel", spot: "header", pad: "x".repeat(600) }))).status).toBe(413);
  });
  it("наводняване от един адрес: 429 след 10", async () => {
    const h = { "sec-fetch-site": "same-origin", "x-forwarded-for": "192.0.2.7" };
    const codes: number[] = [];
    for (let i = 0; i < 12; i++) codes.push((await POST(req({ page: "/", kind: "tel", spot: "page" }, h))).status);
    expect(codes.slice(0, 10).every((c) => c === 204)).toBe(true);
    expect(codes.slice(10)).toEqual([429, 429]);
  });
  it("грешка в базата: 500, не тихо", async () => {
    fail = true;
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await POST(req({ page: "/", kind: "tel", spot: "header" }, { "sec-fetch-site": "same-origin", "x-forwarded-for": "198.51.100.1" }))).status).toBe(500);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
