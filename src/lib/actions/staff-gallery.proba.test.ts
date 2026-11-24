import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import type { FakeStorage } from "@/lib/gallery/fake-storage.testkit";

// Снимки от приложението (№8 В1а, т. 1–3) срещу ЛОКАЛНАТА пробна база (Docker) и подменено хранилище:
// PROBA_DB=1 npx vitest run src/lib/actions/staff-gallery.proba.test.ts
// Без PROBA_DB се прескача. Отказва база извън 127.0.0.1/localhost. Чисти след себе си.
const RUN = process.env.PROBA_DB === "1";

const who = vi.hoisted(() => ({ user: null as null | { id: string; role: string } }));
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: async () => (who.user ? { user: who.user } : null) } } }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
// after(): известието до Снежана тръгва след отговора; тук не се праща нищо (без Telegram ключ).
vi.mock("next/server", async (orig) => ({ ...(await orig<typeof import("next/server")>()), after: () => {} }));
vi.mock("next/navigation", () => ({ redirect: (u: string) => { throw new Error(`REDIRECT:${u}`); } }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const T = `proba-sg-${Date.now()}`;
const U = { a: `${T}-ua`, b: `${T}-ub`, hidden: `${T}-uh`, loose: `${T}-ul` };
const R = { a: `${T}-ra`, b: `${T}-rb`, hidden: `${T}-rh`, ended: `${T}-re` };
const S = { a: `${T}-sa`, b: `${T}-sb` };
const BK = { a: `${T}-bka`, b: `${T}-bkb` };

async function photo(w: number, h: number, format: "jpeg" | "png" = "jpeg") {
  const img = sharp({ create: { width: w, height: h, channels: 3, background: { r: 200, g: 150, b: 140 } } });
  return format === "png" ? img.png().toBuffer() : img.jpeg().withExifMerge({ IFD0: { Make: "Samsung", Model: "SM-A202F" } }).toBuffer();
}

function form(fields: Record<string, string | Buffer>, fileName = "snimka.jpg", fileType = "image/jpeg") {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (Buffer.isBuffer(v)) fd.set(k, new File([new Uint8Array(v)], fileName, { type: fileType }));
    else fd.set(k, v);
  }
  return fd;
}

describe.skipIf(!RUN)("снимки от приложението: качване, «Моите снимки», публичното четене", () => {
  let db: typeof import("@/lib/db").db;
  let schema: typeof import("@/lib/db").schema;
  let A: typeof import("@/lib/actions/staff-gallery");
  let P: typeof import("@/lib/data/public-gallery");
  let store: FakeStorage;
  let big: Buffer;

  const asStaff = (u: string) => { who.user = { id: u, role: "staff" }; };
  const rows = async (resourceId: string) => {
    const { eq } = await import("drizzle-orm");
    return db.select().from(schema.galleryImages).where(eq(schema.galleryImages.uploadedBy, resourceId));
  };
  const upload = (fields: Record<string, string | Buffer>, name?: string, type?: string) =>
    A.uploadStaffGalleryImage(form({ serviceItemId: S.a, noFace: "1", ...fields }, name, type));

  beforeAll(async () => {
    const { config } = await import("dotenv");
    config({ path: ".env.local", quiet: true });
    const host = new URL(process.env.DATABASE_URL ?? "postgresql://x@invalid/x").hostname;
    if (!["127.0.0.1", "localhost"].includes(host)) throw new Error(`Отказ: базата не е локална (${host})`);
    const { startFakeStorage } = await import("@/lib/gallery/fake-storage.testkit");
    store = await startFakeStorage();
    process.env.NEXT_PUBLIC_SUPABASE_URL = store.url;
    process.env.SUPABASE_SERVICE_ROLE_KEY = store.key;
    ({ db, schema } = await import("@/lib/db"));
    A = await import("@/lib/actions/staff-gallery");
    P = await import("@/lib/data/public-gallery");
    big = await photo(1200, 1600);

    const now = new Date();
    await db.insert(schema.user).values(
      Object.values(U).map((id) => ({ id, name: id, email: `${id}@example.com`, role: "staff", createdAt: now, updatedAt: now })),
    );
    await db.insert(schema.resources).values([
      { id: R.a, name: "Проба А", kind: "nails", userId: U.a },
      { id: R.b, name: "Проба Б", kind: "nails", userId: U.b },
      { id: R.hidden, name: "Проба скрит", kind: "nails", userId: U.hidden, active: false },
      { id: R.ended, name: "Проба приключил", kind: "nails", userId: null, active: false },
    ]);
    const base = { tagline: "-", description: "-", longDescription: "-", icon: "-", heroImage: "-", createdAt: now, updatedAt: now };
    await db.insert(schema.serviceCategories).values({ id: `${T}-cat`, slug: `${T}-cat`, title: "Проба", shortTitle: "Проба", ...base });
    await db.insert(schema.serviceItems).values([
      { id: S.a, categoryId: `${T}-cat`, groupTitle: "Маникюр", name: "Гел маникюр", price: 30 },
      { id: S.b, categoryId: `${T}-cat`, groupTitle: "Маникюр", name: "Педикюр с гел лак", price: 40 },
    ]);
    await db.insert(schema.resourceServices).values([
      { id: `${T}-rs1`, resourceId: R.a, serviceItemId: S.a, price: 30 },
      { id: `${T}-rs2`, resourceId: R.b, serviceItemId: S.b, price: 40 },
      { id: `${T}-rs3`, resourceId: R.hidden, serviceItemId: S.a, price: 30 },
    ]);
    const start = new Date("2026-11-21T12:00:00Z");
    const end = new Date("2026-11-21T13:00:00Z");
    await db.insert(schema.bookings).values([
      { id: BK.a, resourceId: R.a, serviceName: "Гел маникюр", startAt: start, endAt: end, status: "completed" },
      { id: BK.b, resourceId: R.b, serviceName: "Педикюр", startAt: start, endAt: end, status: "completed" },
    ]);
    // Стара снимка (отпреди миграцията): без състояние в INSERT → по подразбиране одобрена.
    await db.insert(schema.galleryImages).values({ id: `${T}-old`, src: "/images/gallery/g-1.webp", alt: "стара", category: "manikyur", width: 1200, height: 1600, sortOrder: -100000 });
  });

  beforeEach(() => { who.user = null; });

  afterAll(async () => {
    if (!db) return;
    const { inArray, like, or } = await import("drizzle-orm");
    await db.delete(schema.galleryImages).where(or(like(schema.galleryImages.id, `${T}%`), inArray(schema.galleryImages.uploadedBy, Object.values(R))));
    await db.delete(schema.bookings).where(like(schema.bookings.id, `${T}%`));
    await db.delete(schema.resourceServices).where(like(schema.resourceServices.id, `${T}%`));
    await db.delete(schema.resources).where(like(schema.resources.id, `${T}%`));
    await db.delete(schema.serviceItems).where(like(schema.serviceItems.id, `${T}%`));
    await db.delete(schema.serviceCategories).where(like(schema.serviceCategories.id, `${T}%`));
    await db.delete(schema.user).where(like(schema.user.id, `${T}%`));
    await store?.close();
  });

  it("без вход: към входа на приложението, нищо не се записва", async () => {
    await expect(upload({ file: big })).rejects.toThrow("REDIRECT:/staff/login");
    await expect(A.listMyGalleryImages()).rejects.toThrow("REDIRECT:/staff/login");
  });

  it("приключил специалист (входът е откачен): няма достъп", async () => {
    asStaff(U.loose); // вход без вързан изпълнител, както след «Приключи сътрудничеството»
    await expect(upload({ file: big })).rejects.toThrow("REDIRECT:/staff/login?no_resource=1");
  });

  it("чужд изпълнител във формата се пренебрегва: снимката е на влезлия", async () => {
    asStaff(U.a);
    const r = await upload({ file: big, resourceId: R.b, uploadedBy: R.b, note: "Бледорозов, бадемова форма.", bookingId: BK.a });
    expect(r).toMatchObject({ ok: true });
    const [row] = (await rows(R.a)).filter((x) => x.id === (r as { id: string }).id);
    expect(row).toMatchObject({ uploadedBy: R.a, resourceId: R.a, status: "pending", src: "", serviceItemId: S.a, bookingId: BK.a, staffNote: "Бледорозов, бадемова форма.", category: "manikyur", width: 1200, height: 1600 });
    expect(row.noFaceConfirmedAt).toBeInstanceOf(Date);
    expect(row.createdAt).toBeInstanceOf(Date);
    expect(await rows(R.b)).toHaveLength(0);
  });

  it("чакащата е в частното хранилище, без метаданни, и не е публична по никой път", async () => {
    asStaff(U.a);
    const r = await upload({ file: big });
    if (!r.ok) throw new Error(r.error);
    const [row] = (await rows(R.a)).filter((x) => x.id === r.id);
    expect(row.originalPath).toBe(`${R.a}/${r.id}.jpg`);
    expect(store.buckets.get("gallery-originals")?.public).toBe(false);
    const saved = store.buckets.get("gallery-originals")!.files.get(row.originalPath!)!;
    expect((await sharp(saved.body).metadata()).exif).toBeUndefined();
    expect(store.buckets.get("gallery")?.files.size ?? 0).toBe(0);
    // пряк адрес без вход: публичният път и обикновеният път отказват
    expect((await fetch(`${store.url}/storage/v1/object/public/gallery-originals/${row.originalPath}`)).status).toBe(400);
    expect((await fetch(`${store.url}/storage/v1/object/gallery-originals/${row.originalPath}`)).status).toBe(400);
    // публичното четене: старата снимка да, чакащата не
    const pub = (await P.listPublicGalleryImages()).map((x) => x.id);
    expect(pub).toContain(`${T}-old`);
    expect(pub).not.toContain(r.id);
  });

  it("без потвърждение «не се вижда лице»: отказ, нищо не се записва", async () => {
    asStaff(U.a);
    const before = (await rows(R.a)).length;
    expect(await upload({ file: big, noFace: "" })).toEqual({ ok: false, error: "Потвърди, че на снимката не се вижда лице." });
    expect(await rows(R.a)).toHaveLength(before);
  });

  it("файл, който не е снимка (дори да казва image/jpeg): отказ", async () => {
    asStaff(U.a);
    const r = await upload({ file: Buffer.from("<svg onload=alert(1)>не е снимка</svg>") });
    expect(r).toEqual({ ok: false, error: "Този файл не е снимка. Избери снимка от телефона." });
  });

  it("къса страна под 480 px: отказ; точно 480: минава", async () => {
    asStaff(U.a);
    expect(await upload({ file: await photo(479, 900) })).toEqual({ ok: false, error: "Снимката е твърде малка. Снимай я пак с камерата на телефона." });
    expect(await upload({ file: await photo(480, 640, "png") }, "x.png", "image/png")).toMatchObject({ ok: true });
  });

  it("чужда услуга, чужд час, бележка над 60 знака: отказ", async () => {
    asStaff(U.a);
    expect(await upload({ file: big, serviceItemId: S.b })).toEqual({ ok: false, error: "Избери услуга от своите." });
    expect(await upload({ file: big, bookingId: BK.b })).toEqual({ ok: false, error: "Този час не е твой." });
    expect(await upload({ file: big, note: "а".repeat(61) })).toEqual({ ok: false, error: "Думите за снимката са до 60 знака." });
    expect(await upload({ file: big, note: "а".repeat(60) })).toMatchObject({ ok: true });
  });

  it("дневният таван: 10 снимки на ден; вчерашните не се броят", async () => {
    asStaff(U.b);
    const yesterday = new Date(Date.now() - 36 * 3600 * 1000);
    await db.insert(schema.galleryImages).values(
      Array.from({ length: 9 }, (_, i) => ({ id: `${T}-cap-${i}`, src: "", alt: "", category: "manikyur", width: 1200, height: 1600, uploadedBy: R.b, status: "pending" as const, createdAt: i < 3 ? yesterday : new Date() })),
    );
    // 6 днешни + 4 качени сега = 10
    for (let i = 0; i < 4; i++) expect(await upload({ file: big, serviceItemId: S.b })).toMatchObject({ ok: true });
    expect(await upload({ file: big, serviceItemId: S.b })).toEqual({ ok: false, error: "Днес качи 10 снимки: това е лимитът за ден. Утре можеш да качиш още." });
  });

  it("скрит специалист (не излиза пред клиентите) може да качва", async () => {
    asStaff(U.hidden);
    expect(await upload({ file: big })).toMatchObject({ ok: true });
  });

  it("«Моите снимки»: само своите, със състоянието и причината; чакащата се вижда с подписан адрес", async () => {
    const { eq } = await import("drizzle-orm");
    const [one] = await rows(R.a);
    await db.update(schema.galleryImages).set({ status: "rejected", rejectReason: "Размазана е, снимай я пак на светло.", rejectedAt: new Date() }).where(eq(schema.galleryImages.id, one.id));
    asStaff(U.a);
    const mine = await A.listMyGalleryImages();
    expect(mine.length).toBe((await rows(R.a)).length);
    expect(mine.every((m) => !m.id.startsWith(`${T}-cap`))).toBe(true);
    const back = mine.find((m) => m.id === one.id)!;
    expect(back).toMatchObject({ status: "rejected", rejectReason: "Размазана е, снимай я пак на светло.", serviceName: "Гел маникюр" });
    expect(back.previewUrl).toContain("/object/sign/gallery-originals/");
    expect((await fetch(back.previewUrl!)).status).toBe(200);
    asStaff(U.b);
    const others = await A.listMyGalleryImages();
    expect(others.some((m) => mine.some((x) => x.id === m.id))).toBe(false);
  });

  it("триене: своя чакаща или върната да (и оригиналът изчезва); чужда и одобрена не", async () => {
    const { eq } = await import("drizzle-orm");
    const own = await rows(R.a);
    const pending = own.find((x) => x.status === "pending")!;
    const rejected = own.find((x) => x.status === "rejected")!;
    const approved = own.filter((x) => x.status === "pending")[1];
    await db.update(schema.galleryImages).set({ status: "approved" }).where(eq(schema.galleryImages.id, approved.id));

    asStaff(U.b);
    expect(await A.deleteMyGalleryImage(pending.id)).toEqual({ ok: false, error: "Снимката не е намерена." });
    asStaff(U.a);
    expect(await A.deleteMyGalleryImage(approved.id)).toEqual({ ok: false, error: "Снимката не е намерена." });
    expect(await A.deleteMyGalleryImage(pending.id)).toEqual({ ok: true });
    expect(await A.deleteMyGalleryImage(rejected.id)).toEqual({ ok: true });
    const left = (await rows(R.a)).map((x) => x.id);
    expect(left).not.toContain(pending.id);
    expect(left).not.toContain(rejected.id);
    expect(left).toContain(approved.id);
    expect(store.buckets.get("gallery-originals")!.files.has(pending.originalPath!)).toBe(false);
  });
});
