import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Дневникът на цените (№11) срещу ЛОКАЛНАТА пробна база с приложена 0003_price_log.sql:
// PROBA_DB=1 npx vitest run src/lib/pricing/price-log.proba.test.ts
// Без PROBA_DB се прескача. Отказва база извън 127.0.0.1/localhost. Редовете в price_log остават (само добавяне).
const RUN = process.env.PROBA_DB === "1";

const who = vi.hoisted(() => ({ user: null as null | { id: string; role: string } }));
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: async () => (who.user ? { user: who.user } : null) } } }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({ redirect: (u: string) => { throw new Error(`REDIRECT:${u}`); } }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const T = `proba-pl-${Date.now()}`;
const U = { staff: `${T}-us`, admin: `${T}-ua` };
const R = `${T}-r`;
const CAT = `${T}-cat`;
const S = { a: `${T}-sa`, b: `${T}-sb` };

describe.skipIf(!RUN)("дневник на цените: запис от всеки път", () => {
  let db: typeof import("@/lib/db").db;
  let schema: typeof import("@/lib/db").schema;
  let staff: typeof import("@/lib/actions/resource-services");
  let admin: typeof import("@/lib/actions/service-items");
  let log: typeof import("@/lib/pricing/price-log");
  let since: Date;

  const rowsFor = async (rowId: string) => {
    const { and, eq, gt } = await import("drizzle-orm");
    return db
      .select()
      .from(schema.priceLog)
      .where(and(eq(schema.priceLog.rowId, rowId), gt(schema.priceLog.changedAt, since)))
      .orderBy(schema.priceLog.id);
  };
  const offerId = async (serviceItemId: string) =>
    (await db.query.resourceServices.findFirst({
      where: (r, { and, eq }) => and(eq(r.resourceId, R), eq(r.serviceItemId, serviceItemId)),
    }))!.id;

  beforeAll(async () => {
    const { config } = await import("dotenv");
    config({ path: ".env.local", quiet: true });
    const host = new URL(process.env.DATABASE_URL ?? "postgresql://x@invalid/x").hostname;
    if (!["127.0.0.1", "localhost"].includes(host)) throw new Error(`Отказ: базата не е локална (${host})`);
    ({ db, schema } = await import("@/lib/db"));
    staff = await import("@/lib/actions/resource-services");
    admin = await import("@/lib/actions/service-items");
    log = await import("@/lib/pricing/price-log");

    const now = new Date();
    await db.insert(schema.user).values([
      { id: U.staff, name: U.staff, email: `${U.staff}@example.com`, role: "staff", createdAt: now, updatedAt: now },
      { id: U.admin, name: U.admin, email: `${U.admin}@example.com`, role: "admin", createdAt: now, updatedAt: now },
    ]);
    await db.insert(schema.resources).values({ id: R, name: "Проба дневник", kind: "cosmetics", userId: U.staff });
    const base = { tagline: "-", description: "-", longDescription: "-", icon: "-", heroImage: "-", createdAt: now, updatedAt: now };
    await db.insert(schema.serviceCategories).values({ id: CAT, slug: "kozmetika", title: "Проба", shortTitle: "Проба", ...base });
    await db.insert(schema.serviceItems).values([
      { id: S.a, categoryId: CAT, groupTitle: "Проба", name: `${T} А`, price: 30, currency: "€", durationMin: 30, bufferMin: 10 },
      { id: S.b, categoryId: CAT, groupTitle: "Проба", name: `${T} Б`, price: 40, currency: "€", durationMin: 30, bufferMin: 10 },
    ]);
    since = new Date();
  });

  afterAll(async () => {
    if (!db) return;
    const { eq } = await import("drizzle-orm");
    await db.delete(schema.resources).where(eq(schema.resources.id, R));
    await db.delete(schema.serviceCategories).where(eq(schema.serviceCategories.id, CAT));
    await db.delete(schema.user).where(eq(schema.user.id, U.staff));
    await db.delete(schema.user).where(eq(schema.user.id, U.admin));
  });

  it("«Услуги» в /staff: включване на услуга → ред insert с каталожната цена", async () => {
    who.user = { id: U.staff, role: "staff" };
    expect(await staff.toggleMyService(S.a)).toEqual({ ok: true });
    const rows = await rowsFor(await offerId(S.a));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      tableName: "resource_services", event: "insert", newPrice: 30, resourceId: R, serviceItemId: S.a,
      source: "staff_app", changedBy: U.staff,
    });
  });

  it("«Услуги» в /staff: изключване (без смяна на цената) → без нов ред", async () => {
    expect(await staff.toggleMyService(S.a)).toEqual({ ok: true });
    expect(await rowsFor(await offerId(S.a))).toHaveLength(1);
  });

  it("«Услуги» в /staff: нова цена → ред update със старата и новата", async () => {
    const input = { price: 32.5, priceMax: null, priceFrom: false, currency: "€", durationMin: 30, bufferMin: 10 };
    expect(await staff.updateMyService(S.a, input)).toEqual({ ok: true });
    const rows = await rowsFor(await offerId(S.a));
    expect(rows).toHaveLength(2);
    expect(rows[1]).toMatchObject({ event: "update", oldPrice: 30, newPrice: 32.5, source: "staff_app", changedBy: U.staff });
  });

  it("«Услуги» в /staff: смяна само на времето → без нов ред", async () => {
    const input = { price: 32.5, priceMax: null, priceFrom: false, currency: "€", durationMin: 45, bufferMin: 10 };
    expect(await staff.updateMyService(S.a, input)).toEqual({ ok: true });
    expect(await rowsFor(await offerId(S.a))).toHaveLength(2);
  });

  it("«Услуги» в /staff: цена за неотметната услуга → ред insert", async () => {
    const input = { price: 41, priceMax: null, priceFrom: true, currency: "€", durationMin: 30, bufferMin: 10 };
    expect(await staff.updateMyService(S.b, input)).toEqual({ ok: true });
    const rows = await rowsFor(await offerId(S.b));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ event: "insert", newPrice: 41, newPriceFrom: true, source: "staff_app" });
  });

  it("«Услуги» в /staff: нова услуга в каталога → два реда (каталог и специалист)", async () => {
    const res = await staff.createMyService({
      name: `${T} нова`, groupTitle: "Проба", categorySlug: "kozmetika", price: 55, priceFrom: false, durationMin: 30, bufferMin: 10,
    });
    expect(res.ok).toBe(true);
    const id = (res as { id: string }).id;
    const cat = await rowsFor(id);
    expect(cat[0]).toMatchObject({ tableName: "service_items", event: "insert", newPrice: 55, resourceId: null, source: "staff_app" });
    const own = await rowsFor(await offerId(id));
    expect(own[0]).toMatchObject({ tableName: "resource_services", event: "insert", newPrice: 55, source: "staff_app" });
  });

  it("администрацията: нова услуга и смяна на цена в каталога → редове admin", async () => {
    who.user = { id: U.admin, role: "admin" };
    const input = {
      categoryId: CAT, groupTitle: "Проба", name: `${T} админ`, price: 20, priceMax: null, priceFrom: false,
      currency: "€", duration: null, description: null, durationMin: 30, bufferMin: 10, activeMin: 0, processingMin: 0,
      bookableOnline: true,
    };
    expect(await admin.createServiceItem(input)).toEqual({ ok: true });
    const item = (await db.query.serviceItems.findFirst({ where: (s, { eq }) => eq(s.name, `${T} админ`) }))!;
    expect(await admin.updateServiceItem(item.id, { ...input, description: "само текст" })).toEqual({ ok: true });
    expect(await admin.updateServiceItem(item.id, { ...input, price: 22.5 })).toEqual({ ok: true });
    const rows = await rowsFor(item.id);
    expect(rows.map((r) => [r.event, r.oldPrice, r.newPrice, r.source, r.changedBy])).toEqual([
      ["insert", null, 20, "admin", U.admin],
      ["update", 20, 22.5, "admin", U.admin],
    ]);
  });

  it("скрипт през withPriceLog → source script с името му; пряка заявка → direct", async () => {
    const { eq } = await import("drizzle-orm");
    await log.withPriceLog("script", "proba-skript", (tx) =>
      tx.update(schema.serviceItems).set({ price: 31 }).where(eq(schema.serviceItems.id, S.a)),
    );
    await db.update(schema.serviceItems).set({ price: 33 }).where(eq(schema.serviceItems.id, S.a));
    const rows = await rowsFor(S.a);
    expect(rows.map((r) => [r.oldPrice, r.newPrice, r.source])).toEqual([
      [30, 31, "script"],
      [31, 33, "direct"],
    ]);
    expect(rows[0].changedBy).toBe("proba-skript");
    expect(rows[1].changedBy).toMatch(/^db:/);
  });

  it("дневникът не се трие и не се сменя", async () => {
    const { eq } = await import("drizzle-orm");
    await expect(db.delete(schema.priceLog).where(eq(schema.priceLog.rowId, S.a))).rejects.toThrow();
    await expect(db.update(schema.priceLog).set({ newPrice: 1 }).where(eq(schema.priceLog.rowId, S.a))).rejects.toThrow();
  });

  it("lowestPriceLast30Days: цена при специалист, сменена днес → не може намаление 30 дни", async () => {
    const r = await log.lowestPriceLast30Days(R, S.a);
    expect(r.table).toBe("resource_services");
    expect(r.lowestEur).toBe(30);
    expect(r.reason).toBe("changed_recently");
    expect(r.discountAllowedFrom!.getTime()).toBeGreaterThan(Date.now() + 29 * 24 * 60 * 60 * 1000);
  });

  it("lowestPriceLast30Days: след 31 дни без смяна → може, предишната е сегашната", async () => {
    const r = await log.lowestPriceLast30Days(R, S.a, new Date(Date.now() + 31 * 24 * 60 * 60 * 1000));
    expect(r).toMatchObject({ lowestEur: 32.5, discountAllowed: true, reason: "ok" });
  });
});
