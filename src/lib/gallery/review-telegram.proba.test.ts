import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import type { FakeStorage } from "@/lib/gallery/fake-storage.testkit";

// Одобрението през Telegram, камбанката и поправката на описанието (№8 В3) срещу ЛОКАЛНАТА пробна база,
// подменено хранилище и подменен Telegram (заявките към api.telegram.org не излизат, а се записват):
// PROBA_DB=1 npx vitest run src/lib/gallery/review-telegram.proba.test.ts
// Сменя общия ключ за админ канала в пробната база: целият пробен набор се пуска с --no-file-parallelism.
const RUN = process.env.PROBA_DB === "1";

const who = vi.hoisted(() => ({ user: null as null | { id: string; role: string } }));
const afterTasks = vi.hoisted(() => [] as (() => unknown)[]);
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: async () => (who.user ? { user: who.user } : null) } } }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/server", async (orig) => ({ ...(await orig<typeof import("next/server")>()), after: (fn: () => unknown) => { afterTasks.push(fn); } }));
vi.mock("next/navigation", () => ({ redirect: (u: string) => { throw new Error(`REDIRECT:${u}`); } }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const T = `proba-tg-${Date.now()}`;
const STAFF = `${T}-ua`;
const ADMIN = `${T}-admin`;
const RES = `${T}-ra`;
const SVC = `${T}-svc`;
const BK = `${T}-bk`;
const CHAT = "777000111";

type TgCall = { method: string; body: Record<string, unknown> };

describe.skipIf(!RUN)("одобрението при Снежана през Telegram", () => {
  let db: typeof import("@/lib/db").db;
  let schema: typeof import("@/lib/db").schema;
  let SG: typeof import("@/lib/actions/staff-gallery");
  let GR: typeof import("@/lib/actions/gallery-review");
  let R: typeof import("@/lib/gallery/review");
  let N: typeof import("@/lib/admin/notifications");
  let store: FakeStorage;
  let img: Buffer;
  let savedChat: unknown;
  const calls: TgCall[] = [];
  const realFetch = globalThis.fetch;

  const row = async (id: string) => db.query.galleryImages.findFirst({ where: (g, { eq }) => eq(g.id, id) });
  const flush = async () => { await Promise.all(afterTasks.splice(0).map((fn) => fn())); };
  const press = (data: string, chatId: string | number = CHAT, photo = true) =>
    R.handleGalleryCallback({ id: `cb-${Math.random()}`, data, message: { message_id: 42, chat: { id: chatId }, ...(photo ? { photo: [{}] } : {}) } });
  const last = (method: string) => [...calls].reverse().find((c) => c.method === method);
  async function upload(note = "") {
    who.user = { id: STAFF, role: "staff" };
    const fd = new FormData();
    fd.set("file", new File([new Uint8Array(img)], "x.jpg", { type: "image/jpeg" }));
    fd.set("serviceItemId", SVC);
    fd.set("noFace", "1");
    fd.set("bookingId", BK);
    if (note) fd.set("note", note);
    const r = await SG.uploadStaffGalleryImage(fd);
    who.user = null;
    if (!r.ok) throw new Error(r.error);
    return r.id;
  }
  const setChat = async (chatId: string | null) => {
    const { eq } = await import("drizzle-orm");
    const { ADMIN_CHAT_KEY } = await import("@/lib/telegram");
    await db.delete(schema.siteSettings).where(eq(schema.siteSettings.key, ADMIN_CHAT_KEY));
    if (chatId) await db.insert(schema.siteSettings).values({ key: ADMIN_CHAT_KEY, value: { chatId }, updatedAt: new Date() });
  };

  beforeAll(async () => {
    const { config } = await import("dotenv");
    config({ path: ".env.local", quiet: true });
    const host = new URL(process.env.DATABASE_URL ?? "postgresql://x@invalid/x").hostname;
    if (!["127.0.0.1", "localhost"].includes(host)) throw new Error(`Отказ: базата не е локална (${host})`);
    const { startFakeStorage } = await import("@/lib/gallery/fake-storage.testkit");
    store = await startFakeStorage();
    process.env.NEXT_PUBLIC_SUPABASE_URL = store.url;
    process.env.SUPABASE_SERVICE_ROLE_KEY = store.key;
    process.env.TELEGRAM_BOT_TOKEN = "proba-token";
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.euphoriabeauty.eu";
    store.buckets.set("gallery", { public: true, files: new Map() });
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const u = String(input instanceof Request ? input.url : input);
      if (u.startsWith("https://api.telegram.org/")) {
        calls.push({ method: u.split("/").pop()!, body: JSON.parse(String(init?.body ?? "{}")) });
        return new Response(JSON.stringify({ ok: true, result: { message_id: 42 } }), { status: 200 });
      }
      return realFetch(input, init);
    }) as typeof fetch;

    ({ db, schema } = await import("@/lib/db"));
    SG = await import("@/lib/actions/staff-gallery");
    GR = await import("@/lib/actions/gallery-review");
    R = await import("@/lib/gallery/review");
    N = await import("@/lib/admin/notifications");
    img = await sharp({ create: { width: 900, height: 1200, channels: 3, background: { r: 200, g: 170, b: 160 } } }).jpeg().toBuffer();

    const { ADMIN_CHAT_KEY } = await import("@/lib/telegram");
    savedChat = (await db.query.siteSettings.findFirst({ where: (s, { eq }) => eq(s.key, ADMIN_CHAT_KEY) }))?.value ?? null;

    const now = new Date();
    await db.insert(schema.user).values([
      { id: STAFF, name: "Проба Т", email: `${STAFF}@example.com`, role: "staff", createdAt: now, updatedAt: now },
      { id: ADMIN, name: "Проба админ", email: `${ADMIN}@example.com`, role: "admin", createdAt: now, updatedAt: now },
    ]);
    await db.insert(schema.resources).values({ id: RES, name: "Специалист Т", kind: "nails", userId: STAFF });
    const base = { tagline: "-", description: "-", longDescription: "-", icon: "-", heroImage: "-", createdAt: now, updatedAt: now };
    await db.insert(schema.serviceCategories).values({ id: `${T}-cat`, slug: "manikyur-i-pedikyur-" + T, title: "Проба", shortTitle: "Проба", ...base });
    await db.insert(schema.serviceItems).values({ id: SVC, categoryId: `${T}-cat`, groupTitle: "Маникюр", name: "Гел маникюр", price: 30 });
    await db.insert(schema.resourceServices).values({ id: `${T}-rs`, resourceId: RES, serviceItemId: SVC, price: 30 });
    await db.insert(schema.bookings).values({
      id: BK, resourceId: RES, serviceName: "Гел маникюр", status: "completed",
      startAt: new Date("2026-11-21T12:00:00Z"), endAt: new Date("2026-11-21T13:00:00Z"),
    });
  });

  beforeEach(() => { calls.length = 0; who.user = null; });

  afterAll(async () => {
    globalThis.fetch = realFetch;
    if (!db) return;
    const { eq, like, or } = await import("drizzle-orm");
    await setChat(null);
    if (savedChat) {
      const { ADMIN_CHAT_KEY } = await import("@/lib/telegram");
      await db.insert(schema.siteSettings).values({ key: ADMIN_CHAT_KEY, value: savedChat as object, updatedAt: new Date() });
    }
    await db.delete(schema.galleryImages).where(or(like(schema.galleryImages.id, `${T}%`), eq(schema.galleryImages.uploadedBy, RES)));
    await db.delete(schema.bookings).where(like(schema.bookings.id, `${T}%`));
    await db.delete(schema.resourceServices).where(like(schema.resourceServices.id, `${T}%`));
    await db.delete(schema.resources).where(like(schema.resources.id, `${T}%`));
    await db.delete(schema.serviceItems).where(like(schema.serviceItems.id, `${T}%`));
    await db.delete(schema.serviceCategories).where(like(schema.serviceCategories.id, `${T}%`));
    await db.delete(schema.user).where(like(schema.user.id, `${T}%`));
    await store?.close();
  });

  it("без свързан канал: нищо не тръгва към Telegram, снимката е в камбанката", async () => {
    await setChat(null);
    const id = await upload();
    await flush();
    expect(calls).toEqual([]);
    const bell = await N.loadAdminNotifications();
    expect(bell.items.find((i) => i.id === `${id}:gallery_pending`)).toMatchObject({
      title: "Нова снимка чака одобрение",
      detail: "Специалист Т · Гел маникюр",
      href: "/admin/gallery",
    });
  });

  it("със свързан канал: снимка с подпис и трите бутона", async () => {
    await setChat(CHAT);
    const id = await upload("Бледорозов, бадемова форма.");
    await flush();
    const sent = last("sendPhoto")!;
    expect(sent.body.chat_id).toBe(CHAT);
    expect(String(sent.body.photo)).toContain("/storage/v1/object/sign/gallery-originals/");
    const cap = String(sent.body.caption).split("\n");
    expect(cap[0]).toBe("<b>Нова снимка за галерията</b>");
    expect(cap[1]).toBe("Гел маникюр: бледорозов, бадемова форма");
    expect(cap[2]).toMatch(/^Качена от Специалист Т, днес в \d\d:\d\d$/);
    expect(cap[3]).toBe("Лицето не се вижда");
    const kb = (sent.body.reply_markup as { inline_keyboard: { text: string; callback_data?: string; url?: string }[][] }).inline_keyboard;
    expect(kb[0].map((b) => [b.text, b.callback_data])).toEqual([["Одобри", `gal:ok:${id}`], ["Върни", `gal:rj:${id}`]]);
    expect(kb[1][0]).toEqual({ text: "Поправи описанието", url: `https://www.euphoriabeauty.eu/admin/gallery?edit=${id}` });
  });

  it("чужд чат не може да одобри", async () => {
    await setChat(CHAT);
    const id = await upload();
    await flush();
    calls.length = 0;
    expect(await press(`gal:ok:${id}`, "123")).toBe(true);
    expect((await row(id))?.status).toBe("pending");
    expect(calls.map((c) => c.method)).toEqual(["answerCallbackQuery"]);
  });

  it("«Одобри»: снимката е на сайта със знак и описание, подписът се сменя, бутоните изчезват", async () => {
    await setChat(CHAT);
    const id = await upload("ярко зелено");
    await flush();
    calls.length = 0;
    await press(`gal:ok:${id}`);
    const got = (await row(id))!;
    expect(got).toMatchObject({ status: "approved", alt: "Гел маникюр: ярко зелено", approvedBy: null });
    expect(got.src).toMatch(/\/storage\/v1\/object\/public\/gallery\//);
    expect(last("answerCallbackQuery")!.body.text).toBe("Одобрена. Вече е в галерията на сайта.");
    const ed = last("editMessageCaption")!;
    expect(String(ed.body.caption).split("\n")[0]).toBe("<b>Одобрена. Излиза в галерията.</b>");
    expect(ed.body.reply_markup).toEqual({ inline_keyboard: [] });
    // Второ натискане: казва, че вече е в галерията, и не одобрява пак.
    calls.length = 0;
    await press(`gal:ok:${id}`);
    expect(last("answerCallbackQuery")!.body.text).toBe("Снимката вече е в галерията.");
    expect(store.buckets.get("gallery")!.files.size).toBeGreaterThan(0);
  });

  it("«Върни» → причините → «Назад» → «Върни» → причина: специалистът вижда изречението", async () => {
    await setChat(CHAT);
    const id = await upload();
    await flush();
    calls.length = 0;
    await press(`gal:rj:${id}`);
    let ed = last("editMessageCaption")!;
    expect(String(ed.body.caption).split("\n")[0]).toBe("<b>Защо я връщаш?</b>");
    const kb = (ed.body.reply_markup as { inline_keyboard: { text: string; callback_data?: string; url?: string }[][] }).inline_keyboard;
    expect(kb.map((r) => r[0].text)).toEqual(["Размазана или тъмна", "Вижда се лице", "Работата не личи", "Неподреден фон", "Друга причина", "Назад"]);
    expect(kb[4][0].url).toBe(`https://www.euphoriabeauty.eu/admin/gallery?reject=${id}`);
    await press(`gal:bk:${id}`);
    ed = last("editMessageCaption")!;
    expect(String(ed.body.caption).split("\n")[0]).toBe("<b>Нова снимка за галерията</b>");
    await press(`gal:rr:${id}:1`);
    expect(await row(id)).toMatchObject({ status: "rejected", rejectReason: "Вижда се лице на клиент. Снимай така, че лицето да не влиза в кадър." });
    ed = last("editMessageCaption")!;
    expect(String(ed.body.caption).split("\n")[0]).toBe("<b>Върната. Специалистът ще види причината.</b>");

    who.user = { id: STAFF, role: "staff" };
    const mine = await SG.listMyGalleryImages();
    expect(mine.find((m) => m.id === id)).toMatchObject({ status: "rejected", rejectReason: "Вижда се лице на клиент. Снимай така, че лицето да не влиза в кадър." });
  });

  it("съобщение без снимка (резервният текст) се редактира като текст", async () => {
    await setChat(CHAT);
    const id = await upload();
    await flush();
    calls.length = 0;
    await press(`gal:rj:${id}`, CHAT, false);
    expect(last("editMessageText")).toBeTruthy();
    expect(last("editMessageCaption")).toBeUndefined();
  });

  it("поправеното описание на чакаща излиза при одобрението от Telegram; празното се връща към сглобеното", async () => {
    await setChat(CHAT);
    const id = await upload("розово");
    await flush();
    who.user = { id: ADMIN, role: "admin" };
    expect(await GR.saveGalleryAlt(id, "  Гел маникюр:   нежно розово  ")).toEqual({ ok: true, alt: "Гел маникюр: нежно розово" });
    expect(await GR.saveGalleryAlt(id, "x".repeat(126))).toEqual({ ok: false, error: "Описанието е до 125 знака." });
    const cards = await R.loadGalleryReview();
    expect(cards.pending.find((c) => c.id === id)).toMatchObject({ alt: "Гел маникюр: нежно розово", altSaved: true, uploader: "Специалист Т", noFace: true });
    who.user = null;
    await press(`gal:ok:${id}`);
    expect((await row(id))?.alt).toBe("Гел маникюр: нежно розово");

    who.user = { id: ADMIN, role: "admin" };
    // Одобрена: празното не минава, текстът се сменя.
    expect(await GR.saveGalleryAlt(id, "")).toEqual({ ok: false, error: "Описанието не може да е празно. Върнахме предложеното." });
    expect(await GR.saveGalleryAlt(id, "Гел маникюр: пудрено розово")).toEqual({ ok: true, alt: "Гел маникюр: пудрено розово" });
    expect((await row(id))?.alt).toBe("Гел маникюр: пудрено розово");

    const id2 = await upload("лилаво");
    who.user = { id: ADMIN, role: "admin" };
    await GR.saveGalleryAlt(id2, "нещо друго");
    const back = await GR.saveGalleryAlt(id2, "   ");
    expect(back).toEqual({ ok: true, alt: "Гел маникюр: лилаво" });
    expect((await row(id2))?.alt).toBe("");
  });

  it("гост и специалист не могат да поправят описанието", async () => {
    who.user = { id: STAFF, role: "staff" };
    await expect(GR.saveGalleryAlt("x", "y")).rejects.toThrow("REDIRECT:/admin/login");
    who.user = null;
    await expect(GR.saveGalleryAlt("x", "y")).rejects.toThrow("REDIRECT:/admin/login");
  });
});
