/**
 * Съдържанието на галерията по таблицата на Канопус (№8, решение 30): за всяка снимка категория,
 * описание и дали се скрива. Сменя САМО category, description, alt (описанието е и alt), status,
 * reject_reason и rejected_at в gallery_images. Нищо не трие: скритата е status = 'rejected' с
 * причина, файлът остава. Преди записа старите стойности се пазят във файл и се връщат с --revert.
 *
 *   npx tsx scripts/gallery-content-apply.ts <таблица.json>                       # на сухо
 *   npx tsx scripts/gallery-content-apply.ts <таблица.json> --apply --backup <файл>
 *   npx tsx scripts/gallery-content-apply.ts --revert <файл>                      # връща старото
 *   --env <път до .env>: друга база (по подразбиране .env.local)
 */
import fs from "node:fs";
import { config } from "dotenv";
import postgres from "postgres";
import { galleryCategories } from "../src/lib/data/gallery";

type Entry = { nomer: number; fail: string; kategoriya: string | null; opisanie: string | null; skriva: boolean; prichina: string | null };
type Row = {
  id: string;
  src: string;
  category: string;
  alt: string;
  description: string | null;
  status: string;
  reject_reason: string | null;
  rejected_at: Date | null;
  original_path: string | null;
};
type Change = { id: string; file: string; category: string; text: string; status: "approved" | "rejected"; reason: string | null };

const ALT_MAX = 125;
const base = (s: string) => s.split("/").pop() ?? s;

async function main() {
  const args = process.argv.slice(2);
  const opt = (name: string) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : undefined;
  };
  config({ path: opt("--env") ?? ".env.local", quiet: true });
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("Няма DATABASE_URL.");
  const sql = postgres(dbUrl, { prepare: false, max: 1 });
  console.log(`База: ${new URL(dbUrl).hostname}${new URL(dbUrl).pathname}`);

  try {
    const revert = opt("--revert");
    if (revert) {
      const saved: Row[] = JSON.parse(fs.readFileSync(revert, "utf8"));
      await sql.begin(async (tx) => {
        for (const r of saved) {
          await tx`update gallery_images set category = ${r.category}, alt = ${r.alt}, description = ${r.description},
            status = ${r.status}, reject_reason = ${r.reject_reason}, rejected_at = ${r.rejected_at}
            where id = ${r.id}`;
        }
      });
      console.log(`Върнати ${saved.length} реда от ${revert}.`);
      return;
    }

    const tablePath = args.find((a) => a.endsWith(".json"));
    if (!tablePath) throw new Error("Дай пътя до таблицата (.json).");
    const table: Entry[] = JSON.parse(fs.readFileSync(tablePath, "utf8"));
    const rows = await sql<Row[]>`select id, src, category, alt, description, status, reject_reason, rejected_at, original_path from gallery_images where src <> '' and status <> 'pending'`;

    const errors: string[] = [];
    const changes: Change[] = [];
    const before: Row[] = [];
    for (const e of table) {
      const hits = rows.filter((r) => base(r.src) === base(e.fail));
      if (hits.length !== 1) {
        errors.push(`№${e.nomer} ${base(e.fail)}: ${hits.length} реда в базата`);
        continue;
      }
      const row = hits[0];
      if (row.original_path) {
        errors.push(`№${e.nomer} ${base(e.fail)}: снимка от специалист, тя се пипа само от администрацията`);
        continue;
      }
      const category = e.kategoriya ? galleryCategories.find((c) => c.label === e.kategoriya && c.value !== "all")?.value : row.category;
      if (!category) {
        errors.push(`№${e.nomer} ${base(e.fail)}: непозната категория «${e.kategoriya}»`);
        continue;
      }
      const text = (e.opisanie ?? "").replace(/\s+/g, " ").trim() || row.alt;
      if ([...text].length > ALT_MAX) {
        errors.push(`№${e.nomer} ${base(e.fail)}: описанието е над ${ALT_MAX} знака`);
        continue;
      }
      if (e.skriva && !e.prichina?.trim()) {
        errors.push(`№${e.nomer} ${base(e.fail)}: скрива се без причина`);
        continue;
      }
      before.push(row);
      changes.push({ id: row.id, file: base(row.src), category, text, status: e.skriva ? "rejected" : "approved", reason: e.skriva ? e.prichina!.trim() : null });
    }

    console.log("№ | файл | категория: старо → ново | състояние: старо → ново | описание: старо → ново");
    changes.forEach((c, i) => {
      const r = before[i];
      const cat = r.category === c.category ? c.category : `${r.category} → ${c.category}`;
      const st = r.status === c.status ? c.status : `${r.status} → ${c.status}${c.reason ? ` («${c.reason}»)` : ""}`;
      const old = r.description ?? r.alt;
      const txt = old === c.text ? "същото" : `«${old}» → «${c.text}»`;
      console.log(`${i + 1} | ${c.file} | ${cat} | ${st} | ${txt}`);
    });
    const shown = changes.filter((c) => c.status === "approved");
    const byCat = new Map<string, number>();
    for (const c of shown) byCat.set(c.category, (byCat.get(c.category) ?? 0) + 1);
    console.log(`Редове: ${changes.length}; на сайта остават ${shown.length}, скриват се ${changes.length - shown.length}.`);
    console.log(`По категории (видимите): ${[...byCat].map(([k, n]) => `${k} ${n}`).join(", ")}`);
    if (errors.length) {
      console.error(`Грешки (${errors.length}), нищо не е записано:\n${errors.join("\n")}`);
      process.exitCode = 1;
      return;
    }
    if (!args.includes("--apply")) {
      console.log("На сухо: нищо не е записано.");
      return;
    }
    const backup = opt("--backup");
    if (!backup) throw new Error("При --apply дай --backup <файл> за старите стойности.");
    fs.writeFileSync(backup, JSON.stringify(before, null, 1), { flag: "wx" });
    await sql.begin(async (tx) => {
      for (const c of changes) {
        await tx`update gallery_images set category = ${c.category}, alt = ${c.text}, description = ${c.text},
          status = ${c.status}, reject_reason = ${c.reason},
          rejected_at = ${c.status === "rejected" ? tx`coalesce(rejected_at, now())` : null}
          where id = ${c.id}`;
      }
    });
    const [{ n }] = await sql<{ n: number }[]>`select count(*)::int n from gallery_images where status = 'approved' and src <> ''`;
    console.log(`Записано: ${changes.length} реда. Одобрени на сайта сега: ${n}. Старите стойности: ${backup}`);
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
