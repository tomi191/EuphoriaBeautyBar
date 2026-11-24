/**
 * Малките копия (600 px, WebP) на одобрените снимки от галерията, за плочките на /galeriya
 * (№8, визия №32). Само ДОБАВЯ файлове: нищо не трие, не презаписва и не пипа базата.
 *
 *   npx tsx scripts/gallery-thumbs.ts                      # на сухо: таблица и числата
 *   npx tsx scripts/gallery-thumbs.ts --apply              # записва липсващите копия
 *   npx tsx scripts/gallery-thumbs.ts --env <път до .env>  # друга база и хранилище
 *   npx tsx scripts/gallery-thumbs.ts --apply --public-only # само файловете в public/, хранилището не се пипа
 *
 * Снимка от /public → файлът се пише до нея в public/ (влиза в git).
 * Снимка от хранилището → копието се качва в същото хранилище (upsert: false).
 */
import fs from "node:fs";
import path from "node:path";
import { config } from "dotenv";
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";
import { galleryThumbSrc } from "../src/lib/gallery/thumb";
import { makeGalleryThumb } from "../src/lib/gallery/thumb-image";

type Row = { id: string; src: string };
export type ThumbResult = { id: string; file: string; where: "public" | "storage" | "other"; before: number; thumb: number; action: string };

const BUCKET = "gallery";
const kb = (n: number) => `${(n / 1024).toFixed(0)} KB`;

export async function runGalleryThumbs(opts: { apply: boolean; publicOnly?: boolean; publicDir: string; dbUrl: string; storageUrl?: string; storageKey?: string }) {
  const sql = postgres(opts.dbUrl, { prepare: false, max: 1 });
  const rows = await sql<Row[]>`select id, src from gallery_images where status = 'approved' and src <> '' order by sort_order`;
  await sql.end();

  const storage = opts.storageUrl && opts.storageKey ? createClient(opts.storageUrl, opts.storageKey) : null;
  const prefix = opts.storageUrl ? `${opts.storageUrl}/storage/v1/object/public/${BUCKET}/` : null;
  const out: ThumbResult[] = [];

  for (const r of rows) {
    const thumbSrc = galleryThumbSrc(r.src);
    const file = r.src.split("/").pop() ?? r.src;
    if (!thumbSrc) {
      out.push({ id: r.id, file, where: "other", before: 0, thumb: 0, action: "без разширение, пропусната" });
      continue;
    }
    if (r.src.startsWith("/")) {
      const full = path.join(opts.publicDir, r.src);
      const thumbFile = path.join(opts.publicDir, thumbSrc);
      if (!fs.existsSync(full)) {
        out.push({ id: r.id, file, where: "public", before: 0, thumb: 0, action: "ГРЕШКА: файлът го няма" });
        continue;
      }
      const buf = fs.readFileSync(full);
      if (fs.existsSync(thumbFile)) {
        out.push({ id: r.id, file, where: "public", before: buf.length, thumb: fs.statSync(thumbFile).size, action: "има го" });
        continue;
      }
      const t = await makeGalleryThumb(buf);
      if (opts.apply) fs.writeFileSync(thumbFile, t, { flag: "wx" });
      out.push({ id: r.id, file, where: "public", before: buf.length, thumb: t.length, action: opts.apply ? "записано" : "ще се запише" });
      continue;
    }
    if (prefix && r.src.startsWith(prefix) && opts.publicOnly) {
      out.push({ id: r.id, file, where: "storage", before: 0, thumb: 0, action: "хранилището не се пипа (--public-only)" });
      continue;
    }
    if (prefix && r.src.startsWith(prefix)) {
      const get = (u: string) => fetch(u, { cache: "no-store" }).catch((e: Error) => ({ ok: false, status: e.message }) as const);
      const has = await get(thumbSrc);
      const res = await get(r.src);
      if (!res.ok) {
        out.push({ id: r.id, file, where: "storage", before: 0, thumb: 0, action: `ГРЕШКА: снимката не се отваря (${res.status})` });
        continue;
      }
      const buf = Buffer.from(await (res as Response).arrayBuffer());
      if (has.ok) {
        out.push({ id: r.id, file, where: "storage", before: buf.length, thumb: (await (has as Response).arrayBuffer()).byteLength, action: "има го" });
        continue;
      }
      const t = await makeGalleryThumb(buf);
      let action = "ще се качи";
      if (opts.apply) {
        const { error } = await storage!.storage
          .from(BUCKET)
          .upload(thumbSrc.slice(prefix.length), t, { contentType: "image/webp", upsert: false });
        action = error ? `ГРЕШКА при качване: ${error.message}` : "качено";
      }
      out.push({ id: r.id, file, where: "storage", before: buf.length, thumb: t.length, action });
      continue;
    }
    out.push({ id: r.id, file, where: "other", before: 0, thumb: 0, action: "чужд адрес, пропусната" });
  }
  return out;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const envAt = args.indexOf("--env");
  config({ path: envAt >= 0 ? args[envAt + 1] : ".env.local", quiet: true });
  const apply = args.includes("--apply");
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("Няма DATABASE_URL.");
  const host = new URL(dbUrl).hostname;
  console.log(`База: ${host} · ${apply ? "ЗАПИС (само добавяне)" : "на сухо"}`);

  runGalleryThumbs({
    apply,
    publicOnly: args.includes("--public-only"),
    publicDir: path.resolve("public"),
    dbUrl,
    storageUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    storageKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  })
    .then((rows) => {
      console.log("файл | къде | сега | малко копие | какво");
      for (const r of rows) console.log(`${r.file} | ${r.where} | ${kb(r.before)} | ${kb(r.thumb)} | ${r.action}`);
      const sum = (f: (r: ThumbResult) => number) => rows.reduce((a, r) => a + f(r), 0);
      console.log(`Общо ${rows.length} снимки: сега ${kb(sum((r) => r.before))}, малките копия ${kb(sum((r) => r.thumb))}.`);
      const errors = rows.filter((r) => r.action.startsWith("ГРЕШКА"));
      if (errors.length) {
        console.error(`${errors.length} с грешка.`);
        process.exit(1);
      }
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
