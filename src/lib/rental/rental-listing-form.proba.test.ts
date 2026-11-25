import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

// Формата «Нова обява» срещу ЛОКАЛНАТА пробна база (Docker):
// PROBA_DB=1 npx vitest run src/lib/rental/rental-listing-form.proba.test.ts
// Без PROBA_DB се прескача. Отказва база извън 127.0.0.1/localhost. Facebook е с подменена мрежа:
// истински пост не се прави. Чисти след себе си.
const RUN = process.env.PROBA_DB === "1";

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: async () => ({ user: { id: "proba-admin", role: "admin" } }) } },
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({ redirect: (u: string) => { throw new Error(`REDIRECT:${u}`); } }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const T = `proba-form-${Date.now()}`;

describe.skipIf(!RUN)("формата «Нова обява» срещу пробната база", () => {
  let db: typeof import("@/lib/db").db;
  let schema: typeof import("@/lib/db").schema;
  let A: typeof import("@/lib/actions/rental-listings");
  let R: typeof import("@/lib/data/rental-listings");
  let F: typeof import("@/lib/admin/listing-form-data");
  const ids: string[] = [];
  const cats = { nails: `${T}-nails`, cosm: `${T}-cosm`, hair: `${T}-hair` };

  async function draft(categoryId = cats.nails) {
    const d = await A.createListingDraft({ categoryId });
    if (!d.ok) throw new Error(d.error);
    ids.push(d.id);
    return d;
  }

  beforeAll(async () => {
    const { config } = await import("dotenv");
    config({ path: ".env.local", quiet: true });
    const host = new URL(process.env.DATABASE_URL ?? "postgresql://x@invalid/x").hostname;
    if (!["127.0.0.1", "localhost"].includes(host)) throw new Error(`Отказ: базата не е локална (${host})`);
    delete process.env.FACEBOOK_PAGE_ID;
    delete process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
    ({ db, schema } = await import("@/lib/db"));
    A = await import("@/lib/actions/rental-listings");
    R = await import("@/lib/data/rental-listings");
    F = await import("@/lib/admin/listing-form-data");
    const now = new Date();
    const base = { tagline: "-", description: "-", longDescription: "-", icon: "-", heroImage: "-", createdAt: now, updatedAt: now };
    // Отделни категории със свои адреси, за да не се смесват с данните в пробната база.
    await db.insert(schema.serviceCategories).values([
      { id: cats.nails, slug: `${T}-manikyur`, title: "Маникюр проба", shortTitle: "Маникюр", ...base },
      { id: cats.cosm, slug: `${T}-kozmetika`, title: "Козметика проба", shortTitle: "Козметика", ...base },
      { id: cats.hair, slug: `${T}-frizyor`, title: "Фризьор проба", shortTitle: "Фризьор", ...base },
    ]);
    await db.insert(schema.serviceItems).values([
      { id: `${T}-n1`, categoryId: cats.nails, groupTitle: "Маникюр", name: "Гел лак", price: 30, sortOrder: 1 },
      { id: `${T}-n2`, categoryId: cats.nails, groupTitle: "Маникюр", name: "Изграждане", price: 50, sortOrder: 2 },
      { id: `${T}-c1`, categoryId: cats.cosm, groupTitle: "Лице", name: "Почистване", price: 40, sortOrder: 1 },
      { id: `${T}-h1`, categoryId: cats.hair, groupTitle: "Дамски", name: "Подстригване", price: 30, sortOrder: 1 },
      { id: `${T}-h2`, categoryId: cats.hair, groupTitle: "Грим", name: "Грим", price: 60, sortOrder: 2 },
    ]);
    await db.insert(schema.rentalPositions).values({
      id: `${T}-legacy`, title: "Маникюристка", type: "Под наем", description: "Стара", skills: [], active: true, createdAt: now, updatedAt: now,
    });
    ids.push(`${T}-legacy`);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.FACEBOOK_PAGE_ID;
    delete process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  });

  afterAll(async () => {
    if (!db) return;
    const { inArray, like } = await import("drizzle-orm");
    if (ids.length) await db.delete(schema.rentalPositions).where(inArray(schema.rentalPositions.id, ids));
    await db.delete(schema.serviceItems).where(like(schema.serviceItems.id, `${T}%`));
    await db.delete(schema.serviceCategories).where(like(schema.serviceCategories.id, `${T}%`));
  });

  it("плочките са категориите от базата с услугите им; името се смята само", async () => {
    const list = await F.loadFormCategories();
    const nails = list.find((c) => c.id === cats.nails);
    expect(nails?.services.map((s) => s.name)).toEqual(["Гел лак", "Изграждане"]);
    // Неизвестна за правилата категория → «специалист»; маникюрът на салона → «маникюрист».
    const d = await draft();
    expect(d.title).toBe("Място под наем за специалист");
    const { listingTitle } = await import("@/lib/rental/listing-rules");
    expect(listingTitle("manikyur-i-pedikyur")).toBe("Място под наем за маникюрист");
  });

  it("нова чернова: услугите на категорията отметнати, първите шест предимства отметнати", async () => {
    const d = await draft();
    const row = await F.loadFormListing(d.id);
    expect(row).toMatchObject({ status: "draft", categoryId: cats.nails, serviceIds: [`${T}-n1`, `${T}-n2`] });
    expect(row!.benefits).toEqual(["online-booking", "own-schedule", "telegram-alerts", "evening-digest", "own-prices", "own-hours"]);
  });

  it("смяна на мястото в черновата: ново заглавие, нов адрес, услугите на новата категория", async () => {
    const d = await draft();
    const res = await A.updateListing(d.id, { categoryId: cats.cosm });
    expect(res).toMatchObject({ ok: true });
    const row = await F.loadFormListing(d.id);
    expect(row).toMatchObject({ categoryId: cats.cosm, serviceIds: [`${T}-c1`] });
    expect(res.ok && res.slug).toBe(row!.slug);
    // Услуга от старата категория вече не минава.
    expect((await A.updateListing(d.id, { serviceIds: [`${T}-n1`] })).ok).toBe(false);
  });

  it("уникален адрес: две чернови с едно заглавие получават различни адреси", async () => {
    const a = await draft();
    const b = await draft();
    expect(a.slug).not.toBe(b.slug);
    expect(b.slug).toMatch(new RegExp(`^${a.slug.replace(/-\d+$/, "")}(-\\d+)?$`));
  });

  it("своите редове: пазят се, излизат в обявата, над 60 знака и над 6 реда не минават", async () => {
    const d = await draft();
    expect(await A.updateListing(d.id, { customBenefits: ["Самостоятелна стая с прозорец"] })).toMatchObject({ ok: true });
    expect((await A.updateListing(d.id, { customBenefits: ["я".repeat(61)] })).ok).toBe(false);
    expect((await A.updateListing(d.id, { customBenefits: Array.from({ length: 7 }, (_, i) => `ред ${i}`) })).ok).toBe(false);
    expect(await A.publishListing(d.id)).toMatchObject({ ok: true, status: "published" });
    const pub = await R.getListingBySlug(d.slug);
    expect(pub?.customBenefits).toEqual(["Самостоятелна стая с прозорец"]);
  });

  it("наемът не излиза при изключен ключ, излиза при включен; бележката никога", async () => {
    const d = await draft();
    expect(await A.updateListing(d.id, { rentText: "420", rentPublic: false, adminNote: "НАЕМЪТ Е ТАЙНА 999" })).toMatchObject({ ok: true });
    await A.publishListing(d.id);
    const off = await R.getListingBySlug(d.slug);
    expect(off?.rent).toBeNull();
    expect(JSON.stringify(off)).not.toMatch(/420|ТАЙНА/);
    expect(await A.updateListing(d.id, { rentPublic: true })).toMatchObject({ ok: true });
    const on = await R.getListingBySlug(d.slug);
    expect(on?.rent).toBe("420");
    expect(JSON.stringify(on)).not.toContain("ТАЙНА");
  });

  it("черновата се пази: всичко попълнено се чете обратно при отваряне по-късно", async () => {
    const d = await draft();
    await A.updateListing(d.id, {
      serviceIds: [`${T}-n2`],
      benefits: ["location", "revenue"],
      customBenefits: ["Свой ред"],
      rentText: "300",
      rentPublic: true,
      adminNote: "уговорка",
    });
    expect(await F.loadFormListing(d.id)).toMatchObject({
      status: "draft",
      serviceIds: [`${T}-n2`],
      benefits: ["location", "revenue"],
      customBenefits: ["Свой ред"],
      rentText: "300",
      rentPublic: true,
      adminNote: "уговорка",
    });
    expect(await R.getListingBySlug(d.slug)).toBeNull(); // черновата не е публична
  });

  it("стара обява без категория: формата ѝ дава място, заглавие и адрес", async () => {
    expect(await F.loadFormListing(`${T}-legacy`)).toMatchObject({ categoryId: null, slug: null, status: "published" });
    const res = await A.updateListing(`${T}-legacy`, { categoryId: cats.nails });
    expect(res).toMatchObject({ ok: true, title: "Място под наем за специалист" });
    const row = await F.loadFormListing(`${T}-legacy`);
    expect(row).toMatchObject({ categoryId: cats.nails, serviceIds: [`${T}-n1`, `${T}-n2`] });
    expect(row!.slug).toMatch(/^myasto-pod-naem-za-spetsialist/);
    expect((await R.getListingBySlug(row!.slug!))?.title).toBe("Място под наем за специалист");
  });

  describe("публикуване и Facebook (подменена мрежа)", () => {
    function graph(response: () => Promise<Response>) {
      const calls: { url: string; body: string }[] = [];
      vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
        calls.push({ url: String(url), body: String(init.body) });
        return response();
      });
      return calls;
    }
    const keys = () => {
      process.env.FACEBOOK_PAGE_ID = "1234567890";
      process.env.FACEBOOK_PAGE_ACCESS_TOKEN = "proba-token";
    };

    it("излезе: номерът на поста се пази, текстът е с показания наем (решение от 25.11) и с адреса на обявата", async () => {
      keys();
      const calls = graph(async () => Response.json({ id: "1234567890_42" }));
      const d = await draft();
      await A.updateListing(d.id, { rentText: "555", rentPublic: true, rentExcludes: "без консумативите" });
      const res = await A.publishListing(d.id);
      expect(res).toMatchObject({ ok: true, status: "published", facebook: { status: "posted", postId: "1234567890_42" } });
      expect(calls).toHaveLength(1);
      const body = new URLSearchParams(calls[0].body);
      // Адресът носи метка, за да се различават запитванията от поста (came_from).
      const tagged = `https://www.euphoriabeauty.eu/karieri/${d.slug}?utm_source=facebook&utm_medium=post&utm_campaign=${d.slug}`;
      expect(body.get("link")).toBe(tagged);
      expect(body.get("message")).toContain(`Изпрати запитване от обявата: ${tagged}`);
      expect(body.get("message")).toContain("Свободно е едно място под наем за специалист");
      expect(body.get("message")).toContain(`Наем 555${String.fromCharCode(0xa0)}€ на месец, без консумативите.`);
      expect(JSON.stringify(res)).not.toContain("proba-token");
      const row = await db.query.rentalPositions.findFirst({ where: (p, { eq }) => eq(p.id, d.id) });
      expect(row).toMatchObject({ status: "published", fbPostId: "1234567890_42" });
      expect(row!.fbPostedAt).toBeInstanceOf(Date);
    });

    it("само грим (думата от 25.11): заглавие, адрес и пост «за гримьор», наемът с уточнението; без грим се връща", async () => {
      keys();
      const calls = graph(async () => Response.json({ id: "1234567890_43" }));
      const d = await draft(cats.hair);
      expect(d.title).toBe("Място под наем за специалист");
      const only = await A.updateListing(d.id, { serviceIds: [`${T}-h2`] });
      expect(only).toMatchObject({ ok: true, title: "Място под наем за гримьор" });
      expect(only.ok && only.slug).toMatch(/^myasto-pod-naem-za-grimyor(-\d+)?$/);
      // С още една услуга вече не е само грим: заглавието и адресът на черновата се връщат.
      const both = await A.updateListing(d.id, { serviceIds: [`${T}-h1`, `${T}-h2`] });
      expect(both).toMatchObject({ ok: true, title: "Място под наем за специалист" });
      expect(both.ok && both.slug).toMatch(/^myasto-pod-naem-za-spetsialist/);
      const back = await A.updateListing(d.id, {
        serviceIds: [`${T}-h2`],
        rentText: "150",
        rentPublic: true,
        rentExcludes: "разходите се уговарят на място според това колко често идваш",
      });
      expect(back).toMatchObject({ ok: true, title: "Място под наем за гримьор" });
      const slug = back.ok ? back.slug! : "";
      expect(await A.publishListing(d.id)).toMatchObject({ ok: true, facebook: { status: "posted" } });
      const msg = new URLSearchParams(calls[0].body).get("message");
      expect(msg).toContain("Свободно е едно място под наем за гримьор");
      expect(msg).toContain(
        `Наем 150${String.fromCharCode(0xa0)}€ на месец, разходите се уговарят на място според това колко често идваш.`,
      );
      const pub = await R.getListingBySlug(slug);
      expect(pub?.title).toBe("Място под наем за гримьор");
      // Пуснатата обява пази адреса си (връзката от Facebook), дори заглавието да се смени.
      const after = await A.updateListing(d.id, { serviceIds: [`${T}-h1`, `${T}-h2`] });
      expect(after).toMatchObject({ ok: true, slug });
    });

    it("не е настроено: обявата е публикувана, Facebook казва «off», заявка няма", async () => {
      const calls = graph(async () => Response.json({ id: "x" }));
      const d = await draft();
      expect(await A.publishListing(d.id)).toMatchObject({ ok: true, status: "published", facebook: { status: "off" } });
      expect(calls).toHaveLength(0);
      expect((await R.getListingBySlug(d.slug))?.status).toBe("published");
    });

    it("ключът не важи: обявата е публикувана, Facebook казва «token_invalid»", async () => {
      keys();
      graph(async () => Response.json({ error: { code: 190, error_subcode: 463 } }, { status: 400 }));
      const d = await draft();
      expect(await A.publishListing(d.id)).toMatchObject({ ok: true, status: "published", facebook: { status: "token_invalid", code: 190 } });
      expect((await db.query.rentalPositions.findFirst({ where: (p, { eq }) => eq(p.id, d.id) }))?.fbPostId).toBeNull();
    });

    it("грешка в мрежата: обявата е публикувана, Facebook казва «error»", async () => {
      keys();
      graph(async () => {
        throw new TypeError("fetch failed");
      });
      const d = await draft();
      expect(await A.publishListing(d.id)).toMatchObject({ ok: true, status: "published", facebook: { status: "error" } });
      expect((await R.getListingBySlug(d.slug))?.status).toBe("published");
    });
  });
});
