import sharp from "sharp";
import postgres from "postgres";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FakeStorage } from "@/lib/gallery/fake-storage.testkit";

// Решение 35: scripts/webp-migrate.ts срещу пробната база и подменено хранилище:
// на сухо нищо не пипа; запис → WebP до старите файлове и нови адреси; връщане → старите адреси;
// пак запис → WebP-ът се ползва наново. Старите файлове остават.
// PROBA_DB=1 npx vitest run src/lib/images/webp-migrate.proba.test.ts
// Без PROBA_DB се прескача. Отказва база извън 127.0.0.1/localhost. Чисти след себе си.
const RUN = process.env.PROBA_DB === "1";

describe.skipIf(!RUN)("webp-migrate на пробата", () => {
  let store: FakeStorage;
  let last: { table: string; id: string; column: string; old: string; new: string }[] = [];
  let sql: postgres.Sql;
  let dbUrl: string;
  let mod: typeof import("../../../scripts/webp-migrate");
  let pub: string;
  const id = (s: string) => `wm-${s}`;

  const read = async () => {
    const [b] = await sql`select cover, content_json::text as t from blog_posts where id = ${id("post")}`;
    const [t] = await sql`select image from team_members where id = ${id("tm")}`;
    const [g] = await sql`select src from gallery_images where id = ${id("g")}`;
    return { cover: b.cover as string, text: b.t as string, team: t.image as string, gallery: g.src as string };
  };
  const run = (apply: boolean) =>
    mod.runWebpMigrate({ apply, dbUrl, storageUrl: store.url, storageKey: store.key, publicDir: path.resolve("public") });

  beforeAll(async () => {
    const { config } = await import("dotenv");
    config({ path: ".env.local", quiet: true });
    dbUrl = process.env.DATABASE_URL ?? "postgresql://x@invalid/x";
    const host = new URL(dbUrl).hostname;
    if (!["127.0.0.1", "localhost"].includes(host)) throw new Error(`Отказ: базата не е локална (${host})`);
    const { startFakeStorage } = await import("@/lib/gallery/fake-storage.testkit");
    store = await startFakeStorage();
    mod = await import("../../../scripts/webp-migrate");
    sql = postgres(dbUrl, { prepare: false, max: 1 });

    const png = await sharp({ create: { width: 64, height: 40, channels: 3, background: "#b0c0a8" } }).png().toBuffer();
    const jpg = await sharp({ create: { width: 30, height: 50, channels: 3, background: "#c8b8a6" } })
      .jpeg()
      .withExif({ IFD3: { GPSLatitudeRef: "N", GPSLatitude: "43/1 12/1 3/1" } })
      .toBuffer();
    store.buckets.set("blog-images", {
      public: true,
      files: new Map([
        ["posts/wm.png", { body: png, type: "image/png" }],
        ["posts/wm/inline-1.png", { body: png, type: "image/png" }],
      ]),
    });
    store.buckets.set("gallery", { public: true, files: new Map([["wm-g.jpg", { body: jpg, type: "image/jpeg" }]]) });
    pub = `${store.url}/storage/v1/object/public`;

    await sql`delete from blog_posts where id = ${id("post")}`;
    await sql`delete from team_members where id = ${id("tm")}`;
    await sql`delete from gallery_images where id = ${id("g")}`;
    const content = [{ type: "image", src: `${pub}/blog-images/posts/wm/inline-1.png`, alt: "a" }, { type: "p", text: "/images/x.png е текст" }];
    await sql`insert into blog_posts (id, slug, title, excerpt, category, cover, content_json, published_at, reading_minutes, status, created_at, updated_at)
              values (${id("post")}, 'wm-proba', 'Проба', 'п', 'Коса', ${`${pub}/blog-images/posts/wm.png`}, ${sql.json(content)}, now(), 1, 'draft', now(), now())`;
    await sql`insert into team_members (id, slug, name, role, bio, image, experience, specialties, sort_order, active, created_at, updated_at)
              values (${id("tm")}, 'wm-proba', 'Проба', 'р', 'б', '/images/team/snezhana.jpg', '1', '[]'::jsonb, 99, false, now(), now())`;
    await sql`insert into gallery_images (id, src, alt, category, width, height, sort_order, status)
              values (${id("g")}, ${`${pub}/gallery/wm-g.jpg`}, 'а', 'boyadisvane', 30, 50, 999, 'approved')`;
  });

  afterAll(async () => {
    if (!sql) return;
    // Пробата пипа и чужди редове на пробната база (напр. hero_image): връщат се.
    if (last.length) await mod.revertWebpMigrate(dbUrl, last);
    await sql`delete from blog_posts where id = ${id("post")}`;
    await sql`delete from team_members where id = ${id("tm")}`;
    await sql`delete from gallery_images where id = ${id("g")}`;
    await sql.end();
    await store?.close();
  });

  it("на сухо: таблица, нищо не се пипа", async () => {
    const before = await read();
    const { rows, changes } = await run(false);
    const mine = changes.filter((c) => c.id.startsWith("wm-"));
    expect(mine.map((c) => `${c.table}.${c.column}`).sort()).toEqual(
      ["blog_posts.content_json", "blog_posts.cover", "gallery_images.src", "team_members.image"].sort(),
    );
    expect(rows.filter((r) => r.action === "ще се качи").length).toBeGreaterThanOrEqual(3);
    expect(await read()).toEqual(before);
    expect(store.buckets.get("blog-images")!.files.has("posts/wm.webp")).toBe(false);
  });

  let changes: Awaited<ReturnType<typeof run>>["changes"];

  it("запис: WebP до старите, адресите сочат WebP, старите файлове остават", async () => {
    ({ changes } = await run(true));
    last = changes;
    const now = await read();
    expect(now.cover).toBe(`${pub}/blog-images/posts/wm.webp`);
    expect(now.text).toContain(`${pub}/blog-images/posts/wm/inline-1.webp`);
    expect(now.text).not.toContain("inline-1.png");
    expect(now.text).toContain("/images/x.png е текст"); // текст, не адрес на снимка: не се пипа
    expect(now.team).toBe("/images/team/snezhana.webp");
    expect(now.gallery).toBe(`${pub}/gallery/wm-g.webp`);

    const files = store.buckets.get("blog-images")!.files;
    expect(files.has("posts/wm.png")).toBe(true);
    const w = files.get("posts/wm.webp")!;
    expect(w.type).toBe("image/webp");
    const meta = await sharp(w.body).metadata();
    expect([meta.format, meta.width, meta.height]).toEqual(["webp", 64, 40]);
    const g = await sharp(store.buckets.get("gallery")!.files.get("wm-g.webp")!.body).metadata();
    expect([g.format, g.width, g.height, g.exif]).toEqual(["webp", 30, 50, undefined]);
    expect(store.buckets.get("gallery")!.files.has("wm-g.jpg")).toBe(true);
  });

  it("връщане: старите адреси; после пак запис ползва качения WebP", async () => {
    const r = await mod.revertWebpMigrate(dbUrl, changes);
    last = [];
    expect(r).toEqual({ reverted: changes.length, skipped: 0 });
    const back = await read();
    expect(back.cover).toBe(`${pub}/blog-images/posts/wm.png`);
    expect(back.text).toContain("inline-1.png");
    expect(back.team).toBe("/images/team/snezhana.jpg");
    expect(back.gallery).toBe(`${pub}/gallery/wm-g.jpg`);

    const again = await run(true);
    last = again.changes;
    expect(again.rows.filter((x) => x.file.startsWith("wm") || x.file === "inline-1.png").every((x) => !x.action.startsWith("ГРЕШКА"))).toBe(true);
    expect(again.rows.find((x) => x.file === "wm.png")?.action).toBe("има го");
    expect((await read()).cover).toBe(`${pub}/blog-images/posts/wm.webp`);
  });
});
