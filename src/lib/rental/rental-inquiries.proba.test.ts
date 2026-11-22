import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Пробата срещу ЛОКАЛНАТА пробна база (Docker): PROBA_DB=1 npx vitest run src/lib/rental/rental-inquiries.proba.test.ts
// Без PROBA_DB се прескача. Отказва всяка база, която не е на 127.0.0.1/localhost. Чисти след себе си.
const RUN = process.env.PROBA_DB === "1";

let currentIp = "10.0.0.1";
vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: async () => ({ user: { id: "proba-admin", role: "admin" } }) } },
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": currentIp }) }));
vi.mock("next/navigation", () => ({ redirect: (u: string) => { throw new Error(`REDIRECT:${u}`); } }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const T = `pinq-${Date.now()}`;
const SECRET_NOTE = `БЕЛЕЖКА-${T}`;
const SLUG = `${T}-manikyurist`;
const FILLED = `${T}-zaeto`;

describe.skipIf(!RUN)("запитването срещу пробната база", () => {
  let db: typeof import("@/lib/db").db;
  let schema: typeof import("@/lib/db").schema;
  let A: typeof import("@/lib/actions/rental-inquiries");
  let R: typeof import("@/lib/data/rental-listings");
  let purgeOldInquiries: typeof import("@/lib/rental/inquiry-purge").purgeOldInquiries;
  let loadAdminNotifications: typeof import("@/lib/admin/notifications").loadAdminNotifications;
  let n = 0;
  const form = (over: Record<string, unknown> = {}) => ({
    slug: SLUG,
    token: `${T}-tok-${++n}`,
    name: "Проба Тест",
    phone: "0888 000 000",
    specialty: "Маникюр",
    message: "",
    consent: true,
    website: "",
    ...over,
  });
  const rowsFor = async (phone: string) => {
    const { and, eq, like } = await import("drizzle-orm");
    return db
      .select()
      .from(schema.rentalInquiries)
      .where(and(eq(schema.rentalInquiries.phone, phone), like(schema.rentalInquiries.clientToken, `${T}%`)));
  };

  beforeAll(async () => {
    const { config } = await import("dotenv");
    config({ path: ".env.local", quiet: true });
    const host = new URL(process.env.DATABASE_URL ?? "postgresql://x@invalid/x").hostname;
    if (!["127.0.0.1", "localhost"].includes(host)) throw new Error(`Отказ: базата не е локална (${host})`);
    ({ db, schema } = await import("@/lib/db"));
    A = await import("@/lib/actions/rental-inquiries");
    R = await import("@/lib/data/rental-listings");
    ({ purgeOldInquiries } = await import("@/lib/rental/inquiry-purge"));
    ({ loadAdminNotifications } = await import("@/lib/admin/notifications"));
    const now = new Date();
    await db.insert(schema.serviceCategories).values({
      id: `${T}-cat`, slug: "manikyur-i-pedikyur", title: "Маникюр и педикюр", shortTitle: "Маникюр",
      tagline: "-", description: "-", longDescription: "-", icon: "-", heroImage: "-", createdAt: now, updatedAt: now,
    }).onConflictDoNothing();
    const cat = await db.query.serviceCategories.findFirst({ where: (c, { eq }) => eq(c.slug, "manikyur-i-pedikyur") });
    const base = { type: "Под наем", description: "-", skills: [], categoryId: cat!.id, createdAt: now, updatedAt: now };
    await db.insert(schema.rentalPositions).values([
      { ...base, id: `${T}-p1`, title: "Място под наем за маникюрист", slug: SLUG, status: "published", active: true,
        adminNote: SECRET_NOTE, rentText: "777", rentPublic: false, publishedAt: now },
      { ...base, id: `${T}-p2`, title: "Място под наем за маникюрист", slug: FILLED, status: "filled", active: false },
    ]);
  });

  afterAll(async () => {
    if (!db) return;
    const { like } = await import("drizzle-orm");
    await db.delete(schema.rentalPositions).where(like(schema.rentalPositions.id, `${T}%`)); // запитванията с каскада
    await db.delete(schema.serviceCategories).where(like(schema.serviceCategories.id, `${T}%`));
    vi.restoreAllMocks();
  });

  it("валидно запитване: един ред с каноничния телефон, съгласието и състояние «ново»", async () => {
    currentIp = "10.0.1.1";
    const r = await A.submitRentalInquiry(form({ phone: "0888 000 001", message: "Завърших курс." }));
    expect(r).toEqual({ ok: true });
    const rows = await rowsFor("+359888000001");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ positionId: `${T}-p1`, name: "Проба Тест", specialty: "Маникюр", message: "Завърших курс.", status: "new", handledAt: null });
    expect(rows[0].consentAt).toBeInstanceOf(Date);
    expect(rows[0].ipHash).toMatch(/^[0-9a-f]{32}$/);
    // Без ключ за Telegram и без свързан чат: нищо не тръгва, а дневникът го казва.
    expect(rows[0].notifyLog).toMatchObject({ targets: 0, telegram: [] });
  });

  it.each(["12345", "0888 12a 456", "+44 20 7946 0958", ""])("невалиден телефон %j: грешка по полето, без ред", async (phone) => {
    currentIp = "10.0.1.2";
    const r = await A.submitRentalInquiry(form({ phone }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors?.phone).toBeTruthy();
  });

  it("без съгласие: грешка, без ред", async () => {
    currentIp = "10.0.1.3";
    const r = await A.submitRentalInquiry(form({ phone: "0888 000 003", consent: false }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors?.consent).toBeTruthy();
    expect(await rowsFor("+359888000003")).toHaveLength(0);
  });

  it("капанът: отговорът е «готово», а ред няма", async () => {
    currentIp = "10.0.1.4";
    const r = await A.submitRentalInquiry(form({ phone: "0888 000 004", website: "http://spam.example" }));
    expect(r).toEqual({ ok: true });
    expect(await rowsFor("+359888000004")).toHaveLength(0);
  });

  it("двойно изпращане (същият ключ, едновременно и после): един ред", async () => {
    currentIp = "10.0.1.5";
    const f = form({ phone: "0888 000 005" });
    const both = await Promise.all([A.submitRentalInquiry(f), A.submitRentalInquiry(f)]);
    expect(both).toEqual([{ ok: true }, { ok: true }]);
    expect(await A.submitRentalInquiry(f)).toEqual({ ok: true });
    expect(await rowsFor("+359888000005")).toHaveLength(1);
  });

  it("честотата по телефон: четвъртото за час се отказва", async () => {
    for (let i = 0; i < 3; i++) {
      currentIp = `10.0.2.${i}`;
      expect(await A.submitRentalInquiry(form({ phone: "0888 000 006" }))).toEqual({ ok: true });
    }
    currentIp = "10.0.2.9";
    const r = await A.submitRentalInquiry(form({ phone: "0888 000 006" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/вече има запитвания/);
    expect(await rowsFor("+359888000006")).toHaveLength(3);
  });

  it("честотата по адрес на мрежата: шестото за час се отказва", async () => {
    currentIp = "10.0.3.1";
    for (let i = 0; i < 5; i++) {
      expect(await A.submitRentalInquiry(form({ phone: `0888 000 1${i}0` }))).toEqual({ ok: true });
    }
    const r = await A.submitRentalInquiry(form({ phone: "0888 000 190" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/след час/);
    expect(await rowsFor("+359888000190")).toHaveLength(0);
  });

  it("заето място: грешка, без ред", async () => {
    currentIp = "10.0.1.7";
    const r = await A.submitRentalInquiry(form({ slug: FILLED, phone: "0888 000 007" }));
    expect(r).toEqual({ ok: false, error: "Мястото вече е заето." });
    expect(await rowsFor("+359888000007")).toHaveLength(0);
  });

  it("известието пада: записът остава, грешката е в дневника и в лога, камбанката го показва", async () => {
    currentIp = "10.0.1.8";
    const { eq } = await import("drizzle-orm");
    const key = "telegram_admin_chat_id";
    const before = await db.query.siteSettings.findFirst({ where: (s, { eq: e }) => e(s.key, key) });
    await db.insert(schema.siteSettings).values({ key, value: { chatId: "proba-chat-1" }, updatedAt: new Date() })
      .onConflictDoUpdate({ target: schema.siteSettings.key, set: { value: { chatId: "proba-chat-1" } } });
    const oldToken = process.env.TELEGRAM_BOT_TOKEN;
    process.env.TELEGRAM_BOT_TOKEN = "proba-fake-token";
    const sent: string[] = [];
    const realFetch = globalThis.fetch;
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      if (String(url).startsWith("https://api.telegram.org/")) {
        sent.push(String(init?.body ?? ""));
        return new Response("Bad Gateway", { status: 502 });
      }
      return realFetch(url as RequestInfo, init);
    });
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const r = await A.submitRentalInquiry(form({ phone: "0888 000 008", message: "Без <html> & знаци" }));
      expect(r).toEqual({ ok: true });
    } finally {
      fetchSpy.mockRestore();
      process.env.TELEGRAM_BOT_TOKEN = oldToken;
      if (before) await db.update(schema.siteSettings).set({ value: before.value }).where(eq(schema.siteSettings.key, key));
      else await db.delete(schema.siteSettings).where(eq(schema.siteSettings.key, key));
    }
    const rows = await rowsFor("+359888000008");
    expect(rows).toHaveLength(1);
    expect(rows[0].notifyLog).toMatchObject({ targets: 1, telegram: [{ to: "admin", ok: false }] });
    expect(String((rows[0].notifyLog as { error?: string }).error)).toMatch(/Telegram не тръгна/);
    expect(errSpy.mock.calls.some((c) => String(c[0]).includes("[rental-inquiry]"))).toBe(true);
    errSpy.mockRestore();
    // Текстът към Telegram: трите реда на Саиф, знаците обезвредени.
    expect(sent).toHaveLength(1);
    const body = JSON.parse(sent[0]) as { chat_id: string; text: string };
    expect(body.chat_id).toBe("proba-chat-1");
    expect(body.text).toBe("Запитване за място под наем: маникюрист\nПроба Тест · 0888 000 008\n„Без &lt;html&gt; &amp; знаци“");
    // Камбанката чете таблицата.
    const bell = await loadAdminNotifications();
    const item = bell.items.find((i) => i.kind === "rental_inquiry" && i.detail.includes("0888 000 008"));
    expect(item).toMatchObject({ title: "Ново запитване за място", detail: "Проба Тест, 0888 000 008 · маникюрист" });
    // Списъкът за администрацията показва грешката.
    const list = await A.listRentalInquiries({ positionId: `${T}-p1` });
    expect(list.find((i) => i.phone === "+359888000008")?.notifyError).toMatch(/Telegram не тръгна/);
  });

  it("функциите за администрацията: списък по място и състояние, «обработено», «изтрий»", async () => {
    const all = await A.listRentalInquiries({ positionId: `${T}-p1` });
    expect(all.length).toBeGreaterThan(5);
    expect(all[0].positionTitle).toBe("Място под наем за маникюрист");
    const target = all.find((i) => i.phone === "+359888000001")!;
    expect(await A.markInquiryHandled(target.id)).toEqual({ ok: true });
    const handled = await A.listRentalInquiries({ positionId: `${T}-p1`, status: "handled" });
    expect(handled.map((i) => i.id)).toContain(target.id);
    expect(handled.find((i) => i.id === target.id)?.handledAt).toBeInstanceOf(Date);
    expect((await A.listRentalInquiries({ positionId: `${T}-p1`, status: "new" })).map((i) => i.id)).not.toContain(target.id);
    expect(await A.deleteInquiry(target.id)).toEqual({ ok: true });
    expect(await A.deleteInquiry(target.id)).toEqual({ ok: false, error: "Запитването не е намерено." });
    expect(await rowsFor("+359888000001")).toHaveLength(0);
  });

  it("само за администратор: гост се връща към входа", async () => {
    const auth = await import("@/lib/auth");
    const spy = vi.spyOn(auth.auth.api, "getSession").mockResolvedValue(null as never);
    await expect(A.listRentalInquiries()).rejects.toThrow("REDIRECT:/admin/login");
    await expect(A.markInquiryHandled("x")).rejects.toThrow("REDIRECT:/admin/login");
    await expect(A.deleteInquiry("x")).rejects.toThrow("REDIRECT:/admin/login");
    spy.mockResolvedValue({ user: { id: "s", role: "staff" } } as never);
    await expect(A.listRentalInquiries()).rejects.toThrow("REDIRECT:/admin/login");
    spy.mockRestore();
  });

  it("публичните четения не носят запитванията, бележката и скрития наем", async () => {
    const one = JSON.stringify(await R.getListingBySlug(SLUG));
    const open = JSON.stringify(await R.getOpenListings());
    for (const s of [one, open]) {
      expect(s).not.toContain("0888 000");
      expect(s).not.toContain("+35988800");
      expect(s).not.toContain("Проба Тест");
      expect(s).not.toContain(SECRET_NOTE);
      expect(s).not.toContain("777");
    }
  });

  it("триенето: по-старите от 6 месеца изчезват, по-новите остават", async () => {
    const day = 86400000;
    const now = new Date();
    const old = new Date(now); old.setUTCMonth(old.getUTCMonth() - 6); old.setTime(old.getTime() - day);
    const fresh = new Date(now); fresh.setUTCMonth(fresh.getUTCMonth() - 6); fresh.setTime(fresh.getTime() + day);
    const base = { positionId: `${T}-p1`, name: "Проба", specialty: null, message: null, status: "new" as const };
    await db.insert(schema.rentalInquiries).values([
      { ...base, id: `${T}-old`, phone: "+359888000901", consentAt: old, createdAt: old, clientToken: `${T}-old` },
      { ...base, id: `${T}-fresh`, phone: "+359888000902", consentAt: fresh, createdAt: fresh, clientToken: `${T}-fresh` },
    ]);
    const gone = await purgeOldInquiries(now);
    expect(gone).toBeGreaterThanOrEqual(1);
    expect(await rowsFor("+359888000901")).toHaveLength(0);
    expect(await rowsFor("+359888000902")).toHaveLength(1);
  });
});
