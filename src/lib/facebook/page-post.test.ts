import { describe, expect, it, vi } from "vitest";
import { GRAPH_API_VERSION, postListingToFacebookPage } from "./page-post";

// Мрежата е подменена: истински ключ няма и не се търси.
const TOKEN = "EAAB-fake-token-never-real";
const env = { FACEBOOK_PAGE_ID: "1234567890", FACEBOOK_PAGE_ACCESS_TOKEN: TOKEN };
const input = { message: "Свободно място под наем за маникюрист.", link: "https://www.euphoriabeauty.eu/karieri/myasto-pod-naem-za-manikyurist" };
const json = (status: number, body: unknown) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));

describe("Facebook: публикуване на обява", () => {
  it("«излезе»: номерът и адресът на поста; ключът е в тялото, не в адреса", async () => {
    const f = json(200, { id: "1234567890_987" });
    const r = await postListingToFacebookPage(input, { env, fetchImpl: f as unknown as typeof fetch });
    expect(r).toEqual({ status: "posted", postId: "1234567890_987", postUrl: "https://www.facebook.com/1234567890_987" });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`https://graph.facebook.com/${GRAPH_API_VERSION}/1234567890/feed`);
    expect(url).not.toContain(TOKEN);
    expect(init.method).toBe("POST");
    const body = init.body as URLSearchParams;
    expect(body.get("message")).toBe(input.message);
    expect(body.get("link")).toBe(input.link);
    expect(body.get("access_token")).toBe(TOKEN);
  });

  it("«не е настроено»: без ID или ключ няма опит", async () => {
    const f = vi.fn();
    for (const e of [{}, { FACEBOOK_PAGE_ID: "1" }, { FACEBOOK_PAGE_ACCESS_TOKEN: TOKEN }, { FACEBOOK_PAGE_ID: " ", FACEBOOK_PAGE_ACCESS_TOKEN: TOKEN }]) {
      expect(await postListingToFacebookPage(input, { env: e, fetchImpl: f as unknown as typeof fetch })).toEqual({ status: "off" });
    }
    expect(f).not.toHaveBeenCalled();
  });

  it("«ключът не важи»: 190 (изтекъл/отнет) и липса на право", async () => {
    const cases = [
      { code: 190, error_subcode: 463 },
      { code: 190, error_subcode: 2069032 },
      { code: 1, error_subcode: 2853006 },
      { code: 200 },
    ];
    for (const err of cases) {
      const r = await postListingToFacebookPage(input, {
        env,
        fetchImpl: json(400, { error: { message: `bad ${TOKEN}`, type: "OAuthException", ...err } }) as unknown as typeof fetch,
      });
      expect(r).toEqual({ status: "token_invalid", code: err.code, subcode: err.error_subcode ?? null });
      expect(JSON.stringify(r)).not.toContain(TOKEN);
    }
  });

  it("«грешка»: 5xx, друг код, развален отговор, мрежа, таймаут; ключът не излиза", async () => {
    const results = [
      await postListingToFacebookPage(input, { env, fetchImpl: json(500, { error: { code: 2, message: TOKEN } }) as unknown as typeof fetch }),
      await postListingToFacebookPage(input, { env, fetchImpl: json(400, { error: { code: 100 } }) as unknown as typeof fetch }),
      await postListingToFacebookPage(input, {
        env,
        fetchImpl: vi.fn(async () => new Response("<html>", { status: 502 })) as unknown as typeof fetch,
      }),
      await postListingToFacebookPage(input, {
        env,
        fetchImpl: vi.fn(async () => { throw new TypeError(`fetch failed ${TOKEN}`); }) as unknown as typeof fetch,
      }),
    ];
    expect(results).toEqual([
      { status: "error", reason: "http_500:code_2" },
      { status: "error", reason: "http_400:code_100" },
      { status: "error", reason: "http_502" },
      { status: "error", reason: "network:TypeError" },
    ]);
    expect(JSON.stringify(results)).not.toContain(TOKEN);

    const hang = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_, reject) => init.signal!.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")))),
    );
    const t = await postListingToFacebookPage(input, { env, timeoutMs: 20, fetchImpl: hang as unknown as typeof fetch });
    expect(t).toEqual({ status: "error", reason: "timeout" });
  });

  it("таймаутът покрива и тялото: заглавките идват, тялото спира по средата", async () => {
    const stall = vi.fn(
      async (_url: string, init: RequestInit) =>
        ({
          ok: true,
          status: 200,
          json: () =>
            new Promise((_, reject) => init.signal!.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")))),
        }) as unknown as Response,
    );
    const started = Date.now();
    const r = await postListingToFacebookPage(input, { env, timeoutMs: 30, fetchImpl: stall as unknown as typeof fetch });
    expect(r).toEqual({ status: "error", reason: "timeout" });
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it("връзката трябва да е публичен https адрес", async () => {
    const f = vi.fn();
    for (const link of ["http://www.euphoriabeauty.eu/karieri/x", "https://localhost:3000/karieri/x", "не е адрес"]) {
      const r = await postListingToFacebookPage({ ...input, link }, { env, fetchImpl: f as unknown as typeof fetch });
      expect(r.status).toBe("error");
    }
    expect(f).not.toHaveBeenCalled();
  });
});
