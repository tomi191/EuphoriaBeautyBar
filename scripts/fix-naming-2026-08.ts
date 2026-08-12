/* eslint-disable no-console */
/**
 * Преименуване на услуги към езика на търсенето (одит 12.08.2026): търсен термин
 * отпред, брандът в скоби; фикс на typo/латиница/жаргон. Двуфазово, защото
 * снимките и per-услуга URL-ите са ключирани по slugify(име):
 *
 *   1. `--images` (ЛОКАЛНО, ПРЕДИ commit): копира public/images/services/unique/
 *      <стар-slug>.webp → <нов-slug>.webp, за да влязат в PR-а.
 *   2. `--db` (СЛЕД deploy): прилага преименуванията в production БД.
 *      Редът е важен: rename в БД преди deploy = 404 снимки/страници в прозореца.
 *
 * Идемпотентен: update само ако текущото име съвпада с `from` (иначе skip+warn).
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";
import { slugify } from "../src/lib/utils";

const RENAMES: { id: string; from: string; to: string }[] = [
  { id: "lyDB7lMY9semyjuoI9tV5", from: "Ботокс терапия XTREME HYDRA", to: "Ботокс терапия за коса (Xtreme Hydra)" },
  { id: "oVSvaQLqX-VbyShytTiKP", from: "Дълбоко възстановяване Nashi FILLER Therapy", to: "Дълбоко възстановяване с филър-ефект (Nashi)" },
  { id: "BNhjCRYSg71S_BS5FVsRx", from: "Боядисване +сешоар/изправяне/", to: "Боядисване + сешоар или изправяне" },
  { id: "awoR8Ny-d37XvNXjRSedW", from: "Боя на салона 60мл", to: "Боя от салона (60 мл)" },
  { id: "blxcIuhWSijIom3X4PztD", from: "Корективна система за впити нокти Unibrace", to: "Скоба за врастнал нокът (Unibrace)" },
  { id: "UP4V_fd7v7OyspQgk5Bbb", from: "Терапия за нокти с Magnetic", to: "Заздравяваща терапия за нокти (Magnetic)" },
  { id: "HGCv3OEJlk30JVnK1MHTe", from: "Медицинко почистване на лице със серия Acnon на Gigi", to: "Медицинско почистване на лице със серия Acnon на GIGI" },
  { id: "5IuQe_DspXrJm-CSxscoA", from: "Hydra facial почистване", to: "Hydrafacial почистване" },
  { id: "m0DxUlVfXyC0FcAUtM1WA", from: "Hialufuull хидратация Montibello", to: "Хиалуронова хидратация Montibello" },
  { id: "M6_8r92cZDF_yuWot0PKS", from: "HYALOFUUL Montibello", to: "Хиалуронова терапия за лице Montibello" },
  { id: "PsP8_gFFL6kH5HSbnjcyo", from: "Хибриден протокол Montibello (кислород + Hialufuull)", to: "Хибриден протокол Montibello (кислород + хиалурон)" },
  { id: "UC_B_z0Z00J2PpwadcTaH", from: "GOYUKI лифтинг (90 мин)", to: "Японски лифтинг масаж Goyuki (90 мин)" },
  { id: "-lbe1dLGsUpXwFAbGPH9x", from: "Остеоестетика — лифтинг масаж на лице, шия и деколте", to: "Лифтинг масаж с лимфен дренаж (остеоестетика)" },
  // Кола маска (150 търсения/мес) — терминът влиза в имената, не само в групата.
  { id: "XfCkx80jYokMReOOWEt4k", from: "½ ръце", to: "Кола маска — ½ ръце" },
  { id: "XJZNQVg8V162E2opNQvbE", from: "Цели ръце", to: "Кола маска — цели ръце" },
  { id: "bI_C3JZLYrPkm3Qcu4J-a", from: "Горна устна", to: "Кола маска — горна устна" },
  { id: "NpcU2Rsj6TabSzAsh9fCw", from: "Подмишници", to: "Кола маска — подмишници" },
  { id: "AlRNwiFQFd4eTi-MEaKdj", from: "½ крака", to: "Кола маска — ½ крака" },
  { id: "gluuLQvNvo2zWBtB5j-Ob", from: "Цели крака", to: "Кола маска — цели крака" },
];

const GROUP_RENAMES: { from: string; to: string }[] = [
  { from: "Епилация и оформяне", to: "Кола маска и оформяне на вежди" },
  { from: "Творчество", to: "Грим" },
];

const mode = process.argv[2];
const UNIQUE_DIR = path.join(process.cwd(), "public", "images", "services", "unique");

if (mode === "--images") {
  let copied = 0;
  for (const r of RENAMES) {
    const src = path.join(UNIQUE_DIR, `${slugify(r.from)}.webp`);
    const dst = path.join(UNIQUE_DIR, `${slugify(r.to)}.webp`);
    if (!fs.existsSync(src)) {
      console.log(`— няма снимка за „${r.from}“ (${slugify(r.from)}.webp)`);
      continue;
    }
    if (fs.existsSync(dst)) {
      console.log(`✓ вече копирана: ${path.basename(dst)}`);
      continue;
    }
    fs.copyFileSync(src, dst);
    copied++;
    console.log(`✓ ${path.basename(src)} → ${path.basename(dst)}`);
  }
  console.log(`\nГотово: ${copied} нови копия (старите файлове остават за прехода).`);
  process.exit(0);
}

async function applyDb() {
  const sql = postgres(process.env.DATABASE_URL_SESSION ?? process.env.DATABASE_URL!, { ssl: "require", max: 1 });
  let renamed = 0;
  for (const r of RENAMES) {
    const res = await sql`UPDATE service_items SET name = ${r.to} WHERE id = ${r.id} AND name = ${r.from} RETURNING id`;
    if (res.length) {
      renamed++;
      console.log(`✓ „${r.from}“ → „${r.to}“`);
    } else {
      const cur = await sql`SELECT name FROM service_items WHERE id = ${r.id}`;
      console.warn(`⚠ SKIP ${r.id}: текущо име „${cur[0]?.name ?? "(липсва)"}“ ≠ очакваното „${r.from}“`);
    }
  }
  for (const g of GROUP_RENAMES) {
    const res = await sql`UPDATE service_items SET group_title = ${g.to} WHERE group_title = ${g.from} RETURNING id`;
    console.log(`✓ група „${g.from}“ → „${g.to}“ (${res.length} услуги)`);
  }

  // Описания: медицинската номенклатура → език на клиента; латиница → кирилица.
  const onycho = await sql`
    UPDATE service_items
    SET description = 'Гъбички по ноктите, отлепен или удебелен нокът, врастнал нокът — обработка със стерилни инструменти.'
    WHERE name = 'Обработка на нокти' AND description ILIKE '%онихо%' RETURNING id`;
  console.log(`✓ „Обработка на нокти“ описание на човешки език (${onycho.length})`);
  const gel = await sql`
    UPDATE service_categories SET description = REPLACE(description, 'gel лак', 'гел лак')
    WHERE description LIKE '%gel лак%' RETURNING id`;
  console.log(`✓ „gel лак“ → „гел лак“ в категорийни описания (${gel.length})`);
  // Френски маникюр (7.5K/мес нац.) — да се вижда при услугата, която го включва.
  const fr = await sql`
    UPDATE service_items
    SET description = COALESCE(NULLIF(TRIM(COALESCE(description, '')), '') || ' ', '') || 'Включва френски маникюр и омбре дизайн по желание.'
    WHERE name = 'Маникюр с гел лак' AND COALESCE(description, '') NOT ILIKE '%френски%' RETURNING id`;
  console.log(`✓ „Маникюр с гел лак“ + френски маникюр в описанието (${fr.length})`);

  console.log(`\nГотово: ${renamed}/${RENAMES.length} услуги преименувани.`);
  await sql.end();
  process.exit(0);
}

if (mode === "--db") {
  applyDb().catch((e) => {
    console.error(e);
    process.exit(1);
  });
} else {
  console.error("Ползване: npx tsx scripts/fix-naming-2026-08.ts --images | --db");
  process.exit(1);
}
