/**
 * Решение 35: старите снимки в JPG или PNG → WebP. Само ДОБАВЯ файлове и сменя адреси в базата;
 * старите файлове не се трият (триенето е с отделно «да»).
 *
 *   npx tsx scripts/webp-migrate.ts --env <път до .env>                  # на сухо: таблица и числата
 *   npx tsx scripts/webp-migrate.ts --env <път до .env> --apply          # записва WebP и сменя адресите
 *   npx tsx scripts/webp-migrate.ts --env <път до .env> --revert <файл>  # връща старите адреси
 *
 * Пипа само полетата с адрес на снимка (виж COLUMNS) и адресите на снимки вътре в текста на
 * статиите (blog_posts.content_json: заменя се само самият адрес). Снимка от хранилището → WebP
 * до нея в същата кофа (същият размер, качество 86, без метаданни; upsert: false). Път от /public
 * → същият път с .webp, само ако този файл вече е в public/ (влязъл е с кода).
 * При --apply пише файл за връщане (`--out`, иначе webp-revert-<база>-<час>.json в текущата папка).
 */
import fs from "node:fs";
import path from "node:path";
import { config } from "dotenv";
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";
import { stripToWebp } from "../src/lib/images/strip-metadata";

export type Change = { table: string; id: string; column: string; old: string; new: string };
export type Row = { place: string; file: string; before: number; after: number; action: string };

// Таблица, ключ, колона с адрес на снимка.
const COLUMNS: [string, string, string][] = [
  ["team_members", "id", "image"],
  ["service_categories", "id", "hero_image"],
  ["blog_posts", "id", "cover"],
  ["gallery_images", "id", "src"],
  ["rental_positions", "id", "image"],
  ["resources", "id", "image"],
];
const OLD_EXT = /\.(png|jpe?g)$/i;
const IN_TEXT = /https?:\/\/[^"\s)\\]+?\.(?:png|jpe?g)|\/images\/[^"\s)\\]+?\.(?:png|jpe?g)/gi;

export async function runWebpMigrate(opts: {
  apply: boolean;
  dbUrl: string;
  storageUrl?: string;
  storageKey?: string;
  publicDir: string;
}): Promise<{ rows: Row[]; changes: Change[] }> {
  const sql = postgres(opts.dbUrl, { prepare: false, max: 1 });
  const storage = opts.storageUrl && opts.storageKey ? createClient(opts.storageUrl, opts.storageKey) : null;
  const prefix = opts.storageUrl ? `${opts.storageUrl}/storage/v1/object/public/` : null;
  const rows: Row[] = [];
  const changes: Change[] = [];
  const done = new Map<string, string | null>(); // стар адрес → нов (или null при грешка)

  /** Новият адрес за стария или null, ако не се пипа. Пише WebP в хранилището при --apply. */
  async function convert(url: string, place: string): Promise<string | null> {
    if (done.has(url)) return done.get(url)!;
    const file = url.split("/").pop() ?? url;
    const next = url.replace(OLD_EXT, ".webp");
    let result: string | null = null;
    if (url.startsWith("/")) {
      const exists = fs.existsSync(path.join(opts.publicDir, next));
      rows.push({ place, file, before: 0, after: 0, action: exists ? "public: сочи .webp от кода" : "public: няма .webp, пропусната" });
      result = exists ? next : null;
    } else if (prefix && url.startsWith(prefix)) {
      const [bucket, ...rest] = url.slice(prefix.length).split("/");
      const key = rest.join("/").replace(OLD_EXT, ".webp");
      const res = await fetch(url, { cache: "no-store" }).catch(() => null);
      if (!res?.ok) {
        rows.push({ place, file, before: 0, after: 0, action: `ГРЕШКА: не се отваря (${res?.status ?? "мрежа"})` });
      } else {
        const buf = Buffer.from(await res.arrayBuffer());
        const webp = await stripToWebp(buf);
        if (!webp) {
          rows.push({ place, file, before: buf.length, after: 0, action: "ГРЕШКА: не е снимка" });
        } else {
          let action = "ще се качи";
          if (opts.apply) {
            const up = await storage!.storage.from(bucket).upload(key, webp, { contentType: "image/webp", upsert: false });
            // Вече качен от предно пускане: ползва се той (не се презаписва).
            const exists = up.error && /exist|duplicate/i.test(up.error.message);
            action = !up.error ? "качено" : exists ? "има го" : `ГРЕШКА при качване: ${up.error.message}`;
          }
          rows.push({ place, file, before: buf.length, after: webp.length, action });
          if (!action.startsWith("ГРЕШКА")) result = next;
        }
      }
    } else {
      rows.push({ place, file, before: 0, after: 0, action: "чужд адрес, пропусната" });
    }
    done.set(url, result);
    return result;
  }

  try {
    for (const [table, key, column] of COLUMNS) {
      const list = await sql.unsafe<{ id: string; v: string }[]>(
        `select "${key}"::text as id, "${column}" as v from "${table}" where "${column}" ~* '\\.(png|jpe?g)$'`,
      );
      for (const r of list) {
        const next = await convert(r.v, `${table}.${column}`);
        if (!next) continue;
        changes.push({ table, id: r.id, column, old: r.v, new: next });
        if (opts.apply) {
          await sql.unsafe(`update "${table}" set "${column}" = $1 where "${key}"::text = $2 and "${column}" = $3`, [next, r.id, r.v]);
        }
      }
    }
    const posts = await sql<{ id: string; t: string }[]>`select id::text as id, content_json::text as t from blog_posts`;
    for (const p of posts) {
      for (const url of new Set(p.t.match(IN_TEXT) ?? [])) {
        const next = await convert(url, "blog_posts.content_json");
        if (!next) continue;
        changes.push({ table: "blog_posts", id: p.id, column: "content_json", old: url, new: next });
        if (opts.apply) {
          await sql`update blog_posts set content_json = replace(content_json::text, ${url}, ${next})::jsonb where id::text = ${p.id}`;
        }
      }
    }
  } finally {
    await sql.end();
  }
  return { rows, changes };
}

/** Връща старите адреси. Ред, сменен след миграцията (не е новият адрес), не се пипа. */
export async function revertWebpMigrate(dbUrl: string, changes: Change[]): Promise<{ reverted: number; skipped: number }> {
  const sql = postgres(dbUrl, { prepare: false, max: 1 });
  let reverted = 0;
  let skipped = 0;
  try {
    for (const c of changes) {
      const res =
        c.column === "content_json"
          ? await sql`update blog_posts set content_json = replace(content_json::text, ${c.new}, ${c.old})::jsonb
                      where id::text = ${c.id} and position(${c.new} in content_json::text) > 0`
          : await sql.unsafe(
              `update "${c.table}" set "${c.column}" = $1 where id::text = $2 and "${c.column}" = $3`,
              [c.old, c.id, c.new],
            );
      if (res.count > 0) reverted++;
      else skipped++;
    }
  } finally {
    await sql.end();
  }
  return { reverted, skipped };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const arg = (name: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
  config({ path: arg("--env") ?? ".env.local", quiet: true });
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("Няма DATABASE_URL.");
  const host = new URL(dbUrl).hostname;
  const dbName = new URL(dbUrl).pathname.slice(1) || "db";
  const kb = (n: number) => `${(n / 1024).toFixed(0)} KB`;

  (async () => {
    const revertFile = arg("--revert");
    if (revertFile) {
      const data = JSON.parse(fs.readFileSync(revertFile, "utf8")) as { host: string; changes: Change[] };
      if (data.host !== host) throw new Error(`Файлът е за ${data.host}, а базата е ${host}.`);
      const r = await revertWebpMigrate(dbUrl, data.changes);
      console.log(`База: ${host} · ВРЪЩАНЕ: върнати ${r.reverted}, пропуснати ${r.skipped} (сменени след миграцията).`);
      return;
    }
    const apply = args.includes("--apply");
    console.log(`База: ${host}/${dbName} · ${apply ? "ЗАПИС (добавя WebP, сменя адреси)" : "на сухо"}`);
    const { rows, changes } = await runWebpMigrate({
      apply,
      dbUrl,
      storageUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      storageKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      publicDir: path.resolve("public"),
    });
    console.log("място | файл | сега | WebP | какво");
    for (const r of rows) console.log(`${r.place} | ${r.file} | ${kb(r.before)} | ${kb(r.after)} | ${r.action}`);
    const sum = (f: (r: Row) => number) => rows.reduce((a, r) => a + f(r), 0);
    console.log(`Общо ${rows.length} снимки: ${kb(sum((r) => r.before))} → ${kb(sum((r) => r.after))}; адреси за смяна: ${changes.length}.`);
    if (apply) {
      const out = arg("--out") ?? `webp-revert-${dbName}-${Date.now()}.json`;
      fs.writeFileSync(out, JSON.stringify({ host, at: new Date().toISOString(), changes }, null, 2), { flag: "wx" });
      console.log(`Старите стойности: ${out}`);
    }
    if (rows.some((r) => r.action.startsWith("ГРЕШКА"))) process.exit(1);
  })().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
