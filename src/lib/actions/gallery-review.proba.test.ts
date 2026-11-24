import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import type { FakeStorage } from "@/lib/gallery/fake-storage.testkit";

// Одобряване, връщане и махане от сайта (№8 В1а, т. 4–7) срещу ЛОКАЛНАТА пробна база и подменено хранилище:
// PROBA_DB=1 npx vitest run src/lib/actions/gallery-review.proba.test.ts
// Без PROBA_DB се прескача. Отказва база извън 127.0.0.1/localhost. Чисти след себе си.
const RUN = process.env.PROBA_DB === "1";

const who = vi.hoisted(() => ({ user: null as null | { id: string; role: string } }));
const revalidated = vi.hoisted(() => [] as string[]);
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: async () => (who.user ? { user: who.user } : null) } } }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
// after(): известието до Снежана тръгва след отговора; тук не се праща нищо (без Telegram ключ).
vi.mock("next/server", async (orig) => ({ ...(await orig<typeof import("next/server")>()), after: () => {} }));
vi.mock("next/navigation", () => ({ redirect: (u: string) => { throw new Error(`REDIRECT:${u}`); } }));
vi.mock("next/cache", () => ({ revalidatePath: (p: string) => { revalidated.push(p); } }));

const T = `proba-gr-${Date.now()}`;
const ADMIN = `${T}-admin`;
const STAFF = `${T}-ua`;
const RES = `${T}-ra`;
const SVC = `${T}-svc`;
const BK = `${T}-bk`;

describe.skipIf(!RUN)("одобряване на снимките от специалистите", () => {
  let db: typeof import("@/lib/db").db;
  let schema: typeof import("@/lib/db").schema;
  let SG: typeof import("@/lib/actions/staff-gallery");
  let GR: typeof import("@/lib/actions/gallery-review");
  let G: typeof import("@/lib/actions/gallery");
  let P: typeof import("@/lib/data/public-gallery");
  let store: FakeStorage;
  let dark: Buffer;
  const ids: Record<string, string> = {};

  const asAdmin = () => { who.user = { id: ADMIN, role: "admin" }; };
  const asStaff = () => { who.user = { id: STAFF, role: "staff" }; };
  const row = async (id: string) => db.query.galleryImages.findFirst({ where: (g, { eq }) => eq(g.id, id) });
  const publicIds = async () => (await P.listPublicGalleryImages()).map((x) => x.id);
  async function upload(note = "") {
    asStaff();
    const fd = new FormData();
    fd.set("file", new File([new Uint8Array(dark)], "x.jpg", { type: "image/jpeg" }));
    fd.set("serviceItemId", SVC);
    fd.set("noFace", "1");
    fd.set("bookingId", BK);
    if (note) fd.set("note", note);
    const r = await SG.uploadStaffGalleryImage(fd);
    if (!r.ok) throw new Error(r.error);
    return r.id;
  }

  beforeAll(async () => {
    const { config } = await import("dotenv");
    config({ path: ".env.local", quiet: true });
    const host = new URL(process.env.DATABASE_URL ?? "postgresql://x@invalid/x").hostname;
    if (!["127.0.0.1", "localhost"].includes(host)) throw new Error(`Отказ: базата не е локална (${host})`);
    const { startFakeStorage } = await import("@/lib/gallery/fake-storage.testkit");
    store = await startFakeStorage();
    process.env.NEXT_PUBLIC_SUPABASE_URL = store.url;
    process.env.SUPABASE_SERVICE_ROLE_KEY = store.key;
    // Публичното хранилище на сайта съществува отпреди (качванията на администрацията).
    store.buckets.set("gallery", { public: true, files: new Map() });
    ({ db, schema } = await import("@/lib/db"));
    SG = await import("@/lib/actions/staff-gallery");
    GR = await import("@/lib/actions/gallery-review");
    G = await import("@/lib/actions/gallery");
    P = await import("@/lib/data/public-gallery");
    dark = await sharp({ create: { width: 1200, height: 1600, channels: 3, background: { r: 30, g: 26, b: 32 } } }).jpeg().toBuffer();

    const now = new Date();
    await db.insert(schema.user).values([
      { id: ADMIN, name: "Проба админ", email: `${ADMIN}@example.com`, role: "admin", createdAt: now, updatedAt: now },
      { id: STAFF, name: "Проба А", email: `${STAFF}@example.com`, role: "staff", createdAt: now, updatedAt: now },
    ]);
    await db.insert(schema.resources).values({ id: RES, name: "Проба А", kind: "nails", userId: STAFF });
    const base = { tagline: "-", description: "-", longDescription: "-", icon: "-", heroImage: "-", createdAt: now, updatedAt: now };
    await db.insert(schema.serviceCategories).values({ id: `${T}-cat`, slug: "manikyur-i-pedikyur-" + T, title: "Проба", shortTitle: "Проба", ...base });
    await db.insert(schema.serviceItems).values({ id: SVC, categoryId: `${T}-cat`, groupTitle: "Маникюр", name: "Гел маникюр", price: 30 });
    await db.insert(schema.resourceServices).values({ id: `${T}-rs`, resourceId: RES, serviceItemId: SVC, price: 30 });
    await db.insert(schema.bookings).values({
      id: BK, resourceId: RES, serviceName: "Гел маникюр", status: "completed",
      startAt: new Date("2026-11-21T12:00:00Z"), endAt: new Date("2026-11-21T13:00:00Z"),
    });
    await db.insert(schema.galleryImages).values({ id: `${T}-old`, src: "/images/gallery/g-1.webp", alt: "стара", category: "manikyur", width: 1200, height: 1600 });

    ids.withNote = await upload("Бледорозов, бадемова форма.");
    ids.plain1 = await upload();
    ids.plain2 = await upload();
    ids.toReject = await upload();
    ids.custom = await upload();
  });

  beforeEach(() => { who.user = null; revalidated.length = 0; });

  afterAll(async () => {
    if (!db) return;
    const { eq, like, or } = await import("drizzle-orm");
    await db.delete(schema.galleryImages).where(or(like(schema.galleryImages.id, `${T}%`), eq(schema.galleryImages.uploadedBy, RES)));
    await db.delete(schema.bookings).where(like(schema.bookings.id, `${T}%`));
    await db.delete(schema.resourceServices).where(like(schema.resourceServices.id, `${T}%`));
    await db.delete(schema.resources).where(like(schema.resources.id, `${T}%`));
    await db.delete(schema.serviceItems).where(like(schema.serviceItems.id, `${T}%`));
    await db.delete(schema.serviceCategories).where(like(schema.serviceCategories.id, `${T}%`));
    await db.delete(schema.user).where(like(schema.user.id, `${T}%`));
    await store?.close();
  });

  it("само администратор: специалист и гост отиват към входа на администрацията", async () => {
    asStaff();
    await expect(GR.approveGalleryImage(ids.withNote)).rejects.toThrow("REDIRECT:/admin/login");
    await expect(GR.rejectGalleryImage(ids.withNote, "x")).rejects.toThrow("REDIRECT:/admin/login");
    await expect(GR.removeGalleryImageFromSite(ids.withNote)).rejects.toThrow("REDIRECT:/admin/login");
    who.user = null;
    await expect(GR.approveGalleryImage(ids.withNote)).rejects.toThrow("REDIRECT:/admin/login");
    expect((await row(ids.withNote))?.status).toBe("pending");
  });

  it("до одобрението: не е в публичното четене, няма публичен файл", async () => {
    const pub = await publicIds();
    expect(pub).toContain(`${T}-old`); // старите снимки се виждат
    for (const id of Object.values(ids)) expect(pub).not.toContain(id);
    expect(store.buckets.get("gallery")!.files.size).toBe(0);
  });

  it("одобрена: публичен файл със знак, описание от думите, оригиналът се пази, галерията е опреснена", async () => {
    asAdmin();
    const r = await GR.approveGalleryImage(ids.withNote);
    expect(r).toMatchObject({ ok: true, alt: "Гел маникюр: бледорозов, бадемова форма" });
    const got = (await row(ids.withNote))!;
    expect(got).toMatchObject({ status: "approved", alt: "Гел маникюр: бледорозов, бадемова форма", approvedBy: ADMIN, width: 1200, height: 1600 });
    expect(got.approvedAt).toBeInstanceOf(Date);
    expect(got.src).toMatch(new RegExp(`^${store.url}/storage/v1/object/public/gallery/${ids.withNote}-[a-z0-9]+\\.webp$`));
    expect(store.buckets.get("gallery-originals")!.files.has(got.originalPath!)).toBe(true);

    const res = await fetch(got.src);
    expect(res.status).toBe(200);
    const pubFile = Buffer.from(await res.arrayBuffer());
    expect((await sharp(pubFile).metadata()).format).toBe("webp");
    // знакът: кремав надпис долу вдясно (тъмен спокоен фон, ъгълът е равен → десният)
    const box = { left: 864, top: 1409, width: 288, height: 93 };
    const mean = async (b: Buffer) => {
      const d = await sharp(b).extract(box).removeAlpha().raw().toBuffer();
      return d.reduce((a, v) => a + v, 0) / d.length;
    };
    expect(await mean(pubFile)).toBeGreaterThan((await mean(dark)) + 20);

    expect(await publicIds()).toContain(ids.withNote);
    expect(revalidated).toEqual(expect.arrayContaining(["/galeriya", "/", "/zapazi-chas"]));
  });

  it("без думи: описанието с датата на часа; втората от същия ден е «, кадър 2»", async () => {
    asAdmin();
    expect(await GR.approveGalleryImage(ids.plain1)).toMatchObject({ ok: true, alt: "Гел маникюр: готова работа от 21 ноември" });
    expect(await GR.approveGalleryImage(ids.plain2)).toMatchObject({ ok: true, alt: "Гел маникюр: готова работа от 21 ноември, кадър 2" });
  });

  it("поправеното описание печели; над 125 знака: отказ; втори път одобрение: отказ", async () => {
    asAdmin();
    expect(await GR.approveGalleryImage(ids.custom, { alt: "а".repeat(126) })).toMatchObject({ ok: false });
    expect(await GR.approveGalleryImage(ids.custom, { alt: "  Гел маникюр:   нюд, къси нокти " })).toMatchObject({ ok: true, alt: "Гел маникюр: нюд, къси нокти" });
    expect(await GR.approveGalleryImage(ids.custom)).toEqual({ ok: false, error: "Снимката вече е в галерията." });
  });

  it("върната: с причина, остава само при специалиста, без публичен файл", async () => {
    asAdmin();
    expect(await GR.rejectGalleryImage(ids.toReject, "   ")).toEqual({ ok: false, error: "Напиши причина или избери готова." });
    expect(await GR.rejectGalleryImage(ids.toReject, "Размазана е, снимай я пак на светло.")).toEqual({ ok: true });
    expect(await GR.rejectGalleryImage(ids.toReject, "пак")).toEqual({ ok: false, error: "Снимката не чака одобрение." });
    const got = (await row(ids.toReject))!;
    expect(got).toMatchObject({ status: "rejected", src: "", rejectReason: "Размазана е, снимай я пак на светло." });
    expect(await publicIds()).not.toContain(ids.toReject);
    expect([...store.buckets.get("gallery")!.files.keys()].some((k) => k.startsWith(ids.toReject))).toBe(false);
    asStaff();
    const mine = await SG.listMyGalleryImages();
    expect(mine.find((m) => m.id === ids.toReject)).toMatchObject({ status: "rejected", rejectReason: "Размазана е, снимай я пак на светло." });
  });

  it("махане от сайта: публичният файл изчезва, снимката става върната, оригиналът остава", async () => {
    const before = (await row(ids.plain2))!;
    asAdmin();
    expect(await GR.removeGalleryImageFromSite(ids.plain2)).toEqual({ ok: true });
    const got = (await row(ids.plain2))!;
    expect(got).toMatchObject({ status: "rejected", src: "", rejectReason: "Махната от сайта." });
    expect((await fetch(before.src)).status).toBe(400);
    expect(store.buckets.get("gallery-originals")!.files.has(got.originalPath!)).toBe(true);
    expect(await publicIds()).not.toContain(ids.plain2);
    // старата снимка няма оригинал: маха се само с «Изтрий»
    expect(await GR.removeGalleryImageFromSite(`${T}-old`)).toEqual({ ok: false, error: "Старата снимка се маха с «Изтрий»." });
    expect(await publicIds()).toContain(`${T}-old`);
  });

  it("«Изтрий» от администрацията трие и оригинала без знак", async () => {
    const got = (await row(ids.plain2))!;
    asAdmin();
    expect(await G.deleteGalleryImage(ids.plain2)).toEqual({ ok: true });
    expect(store.buckets.get("gallery-originals")!.files.has(got.originalPath!)).toBe(false);
  });
});
