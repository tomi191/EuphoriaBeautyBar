import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Пробата срещу ЛОКАЛНАТА пробна база (Docker): PROBA_DB=1 npx vitest run src/lib/rental/rental-listings.proba.test.ts
// Без PROBA_DB се прескача. Отказва всяка база, която не е на 127.0.0.1/localhost. Чисти след себе си.
const RUN = process.env.PROBA_DB === "1";

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: async () => ({ user: { id: "proba-admin", role: "admin" } }) } },
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({ redirect: (u: string) => { throw new Error(`REDIRECT:${u}`); } }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const T = `proba-${Date.now()}`;
const SECRET = `ТАЙНА-${T}`;

describe.skipIf(!RUN)("обявата срещу пробната база", () => {
  let db: typeof import("@/lib/db").db;
  let schema: typeof import("@/lib/db").schema;
  let A: typeof import("@/lib/actions/rental-listings");
  let R: typeof import("@/lib/data/rental-listings");
  let endCooperation: typeof import("@/lib/actions/resources").endCooperation;
  const ids: string[] = [];

  beforeAll(async () => {
    const { config } = await import("dotenv");
    config({ path: ".env.local", quiet: true });
    const host = new URL(process.env.DATABASE_URL ?? "postgresql://x@invalid/x").hostname;
    if (!["127.0.0.1", "localhost"].includes(host)) throw new Error(`Отказ: базата не е локална (${host})`);
    ({ db, schema } = await import("@/lib/db"));
    A = await import("@/lib/actions/rental-listings");
    R = await import("@/lib/data/rental-listings");
    ({ endCooperation } = await import("@/lib/actions/resources"));
    const now = new Date();
    await db.insert(schema.serviceCategories).values({
      id: `${T}-cat`, slug: "manikyur-i-pedikyur", title: "Маникюр и педикюр", shortTitle: "Маникюр",
      tagline: "-", description: "-", longDescription: "-", icon: "-", heroImage: "-", createdAt: now, updatedAt: now,
    }).onConflictDoNothing();
    const cat = await db.query.serviceCategories.findFirst({ where: (c, { eq }) => eq(c.slug, "manikyur-i-pedikyur") });
    await db.insert(schema.serviceItems).values([
      { id: `${T}-s1`, categoryId: cat!.id, groupTitle: "Маникюр", name: "Гел лак", price: 30, sortOrder: 1 },
      { id: `${T}-s2`, categoryId: cat!.id, groupTitle: "Маникюр", name: "Изграждане", price: 50, sortOrder: 2 },
      { id: `${T}-s3`, categoryId: cat!.id, groupTitle: "Архив", name: "Стара", price: 1, bookableOnline: false },
    ]);
    await db.insert(schema.resources).values({ id: `${T}-r`, name: "Проба Маникюр", kind: "nails", createdAt: now, updatedAt: now });
    await db.insert(schema.rentalPositions).values({
      id: `${T}-legacy`, title: "Стар ред", type: "Под наем", description: "Стара обява", skills: ["гел"],
      active: true, createdAt: now, updatedAt: now,
    });
    ids.push(`${T}-legacy`);
  });

  afterAll(async () => {
    if (!db) return;
    const { inArray, like } = await import("drizzle-orm");
    if (ids.length) await db.delete(schema.rentalPositions).where(inArray(schema.rentalPositions.id, ids));
    await db.delete(schema.serviceItems).where(like(schema.serviceItems.id, `${T}%`));
    await db.delete(schema.resources).where(like(schema.resources.id, `${T}%`));
    await db.delete(schema.serviceCategories).where(like(schema.serviceCategories.id, `${T}%`));
  });

  it("целият път: чернова → публикувана → заета → край на сътрудничеството → спряна → отворена", async () => {
    const cat = await db.query.serviceCategories.findFirst({ where: (c, { eq }) => eq(c.slug, "manikyur-i-pedikyur") });
    const d1 = await A.createListingDraft({ categoryId: cat!.id });
    const d2 = await A.createListingDraft({ categoryId: cat!.id });
    if (!d1.ok || !d2.ok) throw new Error("черновата не стана");
    ids.push(d1.id, d2.id);
    expect(d1.title).toBe("Място под наем за маникюрист");
    expect(d1.slug).toMatch(/^myasto-pod-naem-za-manikyurist(-\d+)?$/);
    expect(d2.slug).not.toBe(d1.slug);

    const row = await db.query.rentalPositions.findFirst({ where: (p, { eq }) => eq(p.id, d1.id) });
    expect(row).toMatchObject({ status: "draft", active: false });
    expect(row!.serviceIds).toEqual(expect.arrayContaining([`${T}-s1`, `${T}-s2`]));
    expect(row!.serviceIds).not.toContain(`${T}-s3`);

    // Черновата не е публична.
    expect(await R.getListingBySlug(d1.slug)).toBeNull();

    expect(await A.updateListing(d1.id, { serviceIds: [`${T}-s2`, `${T}-s1`], benefits: ["location", "online-booking"], adminNote: SECRET })).toEqual({ ok: true });
    expect((await A.updateListing(d1.id, { serviceIds: ["chuzhda"] })).ok).toBe(false);
    expect((await A.pauseListing(d1.id)).ok).toBe(false); // чернова не се спира

    expect(await A.publishListing(d1.id)).toEqual({ ok: true, status: "published" });
    expect((await A.publishListing(d1.id)).ok).toBe(false); // второ натискане

    const one = await R.getListingBySlug(d1.slug);
    expect(one).toMatchObject({ title: "Място под наем за маникюрист", status: "published", category: { slug: "manikyur-i-pedikyur" } });
    expect(one!.services.map((s) => s.name)).toEqual(["Изграждане", "Гел лак"]);
    expect(one!.benefits.map((b) => b.left)).toEqual(["Онлайн записване по избор", "Салон в кв. Левски"]);
    const open = await R.getOpenListings();
    expect(open.map((l) => l.id)).toEqual(expect.arrayContaining([d1.id, `${T}-legacy`]));
    expect(open.find((l) => l.id === `${T}-legacy`)).toMatchObject({ slug: null, category: null, description: "Стара обява" });
    expect(JSON.stringify([one, open])).not.toContain(SECRET);
    expect(await R.hasOpenListings()).toBe(true);

    expect(await A.markListingFilled(d1.id, `${T}-r`)).toEqual({ ok: true, status: "filled" });
    expect((await db.query.rentalPositions.findFirst({ where: (p, { eq }) => eq(p.id, d1.id) }))).toMatchObject({ active: false, filledByResourceId: `${T}-r` });
    expect((await R.getListingBySlug(d1.slug))?.status).toBe("filled");
    expect((await R.getOpenListings()).map((l) => l.id)).not.toContain(d1.id);

    const ended = await endCooperation(`${T}-r`);
    expect(ended).toMatchObject({ ok: true, pausedListings: [{ id: d1.id }] });
    expect(await R.getListingBySlug(d1.slug)).toBeNull(); // спряната не е публична

    expect(await A.reopenListing(d1.id)).toEqual({ ok: true, status: "published" });
    const reopened = await db.query.rentalPositions.findFirst({ where: (p, { eq }) => eq(p.id, d1.id) });
    expect(reopened).toMatchObject({ status: "published", active: true, filledByResourceId: null, filledAt: null, adminNote: SECRET });
  });

  it("наемът: ключът е изключен по подразбиране, сумата излиза само при включен", async () => {
    const cat = await db.query.serviceCategories.findFirst({ where: (c, { eq }) => eq(c.slug, "manikyur-i-pedikyur") });
    const d = await A.createListingDraft({ categoryId: cat!.id });
    if (!d.ok) throw new Error("черновата не стана");
    ids.push(d.id);
    expect(await db.query.rentalPositions.findFirst({ where: (p, { eq }) => eq(p.id, d.id) })).toMatchObject({ rentText: null, rentPublic: false });

    expect(await A.updateListing(d.id, { rentText: " 645 " })).toEqual({ ok: true });
    expect((await A.updateListing(d.id, { rentText: "много" })).ok).toBe(false);
    expect(await A.publishListing(d.id)).toEqual({ ok: true, status: "published" });
    const hidden = await R.getListingBySlug(d.slug);
    expect(hidden?.rent).toBeNull();
    expect(JSON.stringify([hidden, await R.getOpenListings()])).not.toContain("645");

    expect(await A.updateListing(d.id, { rentPublic: true })).toEqual({ ok: true });
    expect((await R.getListingBySlug(d.slug))?.rent).toBe("645");
    // Включен ключ без сума не се пази.
    expect(await A.updateListing(d.id, { rentText: "" })).toEqual({ ok: false, error: "Въведи сума или изключи ключа." });
    expect(await A.updateListing(d.id, { rentPublic: false, rentText: null })).toEqual({ ok: true });
    expect((await R.getListingBySlug(d.slug))?.rent).toBeNull();
  });

  it("стар ред: спиране и отваряне вървят, публикуване не (няма категория)", async () => {
    expect((await A.publishListing(`${T}-legacy`)).ok).toBe(false);
    expect(await A.pauseListing(`${T}-legacy`)).toEqual({ ok: true, status: "paused" });
    expect(await A.reopenListing(`${T}-legacy`)).toEqual({ ok: true, status: "published" });
  });
});
