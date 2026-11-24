import { describe, expect, it, vi } from "vitest";
import { GRAPH_API_VERSION, deleteFacebookPost, postCarouselToFacebookPage, postPhotoToFacebookPage } from "./page-post";

// №11, част 4: постът с картина, каруселът и триенето. Мрежата е подменена: истински пост няма.
const TOKEN = "EAAB-fake-token-never-real";
const env = { FACEBOOK_PAGE_ID: "1234567890", FACEBOOK_PAGE_ACCESS_TOKEN: TOKEN };
const json = (status: number, body: unknown) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
const call = (f: ReturnType<typeof json>, i = 0) => {
  const [url, init] = f.mock.calls[i] as unknown as [string, RequestInit];
  return { url, body: init.body as URLSearchParams };
};
const site = "https://www.euphoriabeauty.eu";

describe("Facebook: промоциите", () => {
  it("постът с картина: /photos с url и caption; пази post_id, не id на снимката", async () => {
    const f = json(200, { id: "555", post_id: "1234567890_777" });
    const r = await postPhotoToFacebookPage({ caption: "Текст", imageUrl: `${site}/api/og/promo/x` }, { env, fetchImpl: f as unknown as typeof fetch });
    expect(r).toEqual({ status: "posted", postId: "1234567890_777", postUrl: "https://www.facebook.com/1234567890_777" });
    const { url, body } = call(f);
    expect(url).toBe(`https://graph.facebook.com/${GRAPH_API_VERSION}/1234567890/photos`);
    expect(url).not.toContain(TOKEN);
    expect(body.get("caption")).toBe("Текст");
    expect(body.get("url")).toBe(`${site}/api/og/promo/x`);
  });

  it("картина от localhost не се праща; без ключ няма опит; отказ на Meta е грешка", async () => {
    const f = json(200, {});
    expect(await postPhotoToFacebookPage({ caption: "a", imageUrl: "http://localhost:3151/x" }, { env, fetchImpl: f as unknown as typeof fetch })).toEqual({
      status: "error",
      reason: "image_not_public",
    });
    expect(await postPhotoToFacebookPage({ caption: "a", imageUrl: `${site}/x` }, { env: {}, fetchImpl: f as unknown as typeof fetch })).toEqual({ status: "off" });
    expect(f).not.toHaveBeenCalled();
    const bad = json(400, { error: { code: 100, message: "Invalid parameter" } });
    expect(await postPhotoToFacebookPage({ caption: "a", imageUrl: `${site}/x` }, { env, fetchImpl: bad as unknown as typeof fetch })).toEqual({
      status: "error",
      reason: "http_400:code_100",
    });
  });

  it("каруселът: /feed с child_attachments (от 2 до 5 карти, всяка със своя връзка)", async () => {
    const f = json(200, { id: "1234567890_888" });
    const cards = Array.from({ length: 6 }, (_, i) => ({ link: `${site}/promotsii?id=c${i}`, picture: `${site}/api/og/promo/c${i}?f=sq`, name: `У${i}`, description: "д" }));
    const r = await postCarouselToFacebookPage({ message: "м", link: `${site}/promotsii`, cards }, { env, fetchImpl: f as unknown as typeof fetch });
    expect(r).toMatchObject({ status: "posted", postId: "1234567890_888" });
    const { url, body } = call(f);
    expect(url).toBe(`https://graph.facebook.com/${GRAPH_API_VERSION}/1234567890/feed`);
    const sent = JSON.parse(body.get("child_attachments")!);
    expect(sent).toHaveLength(5);
    expect(sent.map((c: { link: string }) => c.link)).toEqual(cards.slice(0, 5).map((c) => c.link));
    const one = json(200, {});
    expect(await postCarouselToFacebookPage({ message: "м", link: `${site}/promotsii`, cards: cards.slice(0, 1) }, { env, fetchImpl: one as unknown as typeof fetch })).toEqual({
      status: "error",
      reason: "carousel_too_small",
    });
    expect(one).not.toHaveBeenCalled();
  });

  it("триенето: POST /{post-id} с method=delete; отказ и лош номер", async () => {
    const f = json(200, { success: true });
    expect(await deleteFacebookPost("1234567890_777", { env, fetchImpl: f as unknown as typeof fetch })).toEqual({ status: "deleted" });
    const { url, body } = call(f);
    expect(url).toBe(`https://graph.facebook.com/${GRAPH_API_VERSION}/1234567890_777`);
    expect(body.get("method")).toBe("delete");
    expect(url).not.toContain(TOKEN);
    const no = json(400, { error: { code: 100 } });
    expect(await deleteFacebookPost("1234567890_777", { env, fetchImpl: no as unknown as typeof fetch })).toEqual({ status: "error", reason: "http_400:code_100" });
    const gone = json(400, { error: { code: 190 } });
    expect(await deleteFacebookPost("1_2", { env, fetchImpl: gone as unknown as typeof fetch })).toMatchObject({ status: "token_invalid" });
    expect(await deleteFacebookPost("../me", { env, fetchImpl: f as unknown as typeof fetch })).toEqual({ status: "error", reason: "post_id_invalid" });
  });
});
