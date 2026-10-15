/* eslint-disable no-console */
import "./load-env";
import { and, eq, inArray } from "drizzle-orm";

/**
 * Каталожният ред `service_items` е само базата/fallback; публичният ценоразпис и
 * записванията четат офертата на изпълнителя от `resource_services`. Каталогът се
 * разминава (кичури 36/46/61 € срещу 65/70/65 € при Снежана), защото Снежана
 * редактира цените си в staff PWA. Затова нейните АКТИВНИ оферти са източникът на
 * истина за фризьорските услуги, а този скрипт ги пренася обратно в каталога.
 *
 * Dry-run по подразбиране.
 *   --apply                 пише (една транзакция, само различаващите се полета)
 *   --resource <id|име>     изпълнител (по подразб.: активният, чието име почва със "Снежана")
 *   --all-fields            синхронизира и durationMin/bufferMin
 *   --force                 позволява промени над 3x / под 1/3 от старата цена
 * service_items няма updatedAt колона, затова няма какво да пазим там.
 */
const argv = process.argv.slice(2);
const APPLY = argv.includes("--apply");
const ALL_FIELDS = argv.includes("--all-fields");
const FORCE = argv.includes("--force");
const resIdx = argv.indexOf("--resource");
const RESOURCE_ARG = resIdx >= 0 ? argv[resIdx + 1] : undefined;

const HAIR_SLUGS = ["frizorski-uslugi", "frizorski-terapii"];

type Field = "price" | "priceMax" | "priceFrom" | "currency" | "durationMin" | "bufferMin";
type Diff = { field: Field; from: unknown; to: unknown };

// null и undefined се третират еднакво; числата се сравняват числово (float real колона).
function same(a: unknown, b: unknown): boolean {
  if ((a === null || a === undefined) && (b === null || b === undefined)) return true;
  if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) < 1e-6;
  return a === b;
}

const fmt = (v: unknown) => (v === null || v === undefined ? "null" : String(v));

async function main() {
  const { db, schema } = await import("../src/lib/db");
  const { resources, resourceServices, serviceItems, serviceCategories } = schema;

  // 1. Изпълнител — точно един.
  const allRes = await db.select().from(resources);
  let candidates;
  if (RESOURCE_ARG) {
    const needle = RESOURCE_ARG.toLowerCase();
    candidates = allRes.filter((r) => r.id === RESOURCE_ARG || r.name.toLowerCase().includes(needle));
  } else {
    candidates = allRes.filter((r) => r.active && r.name.startsWith("Снежана"));
  }
  if (candidates.length !== 1) {
    console.error(
      `Очакван точно 1 изпълнител, намерени ${candidates.length}: ${candidates.map((r) => `${r.id}/${r.name}`).join(", ") || "-"}`,
    );
    process.exit(1);
  }
  const res = candidates[0];
  console.log(`Изпълнител: ${res.name} (${res.id}, kind=${res.kind}, active=${res.active})`);
  console.log(`Режим: ${APPLY ? "APPLY" : "DRY-RUN"}${ALL_FIELDS ? ", --all-fields" : ""}\n`);

  // 2. Активни оферти + каталог + категория.
  async function load() {
    return db
      .select({
        offer: resourceServices,
        item: serviceItems,
        catSlug: serviceCategories.slug,
        catTitle: serviceCategories.title,
        catOrder: serviceCategories.sortOrder,
      })
      .from(resourceServices)
      .innerJoin(serviceItems, eq(resourceServices.serviceItemId, serviceItems.id))
      .innerJoin(serviceCategories, eq(serviceItems.categoryId, serviceCategories.id))
      .where(and(eq(resourceServices.resourceId, res.id), eq(resourceServices.active, true)));
  }

  const syncFields: Field[] = ["price", "priceMax", "priceFrom", "currency"];
  if (ALL_FIELDS) syncFields.push("durationMin", "bufferMin");

  function computeDiffs(rows: Awaited<ReturnType<typeof load>>) {
    const out: { row: (typeof rows)[number]; diffs: Diff[]; info: Diff[] }[] = [];
    const warnings: string[] = [];
    for (const row of rows) {
      const { offer, item } = row;
      if (offer.currency !== "€") {
        warnings.push(`ПРОПУСНАТО "${item.name}": валута на офертата е "${offer.currency}", не "€"`);
        continue;
      }
      const diffs: Diff[] = [];
      const info: Diff[] = [];
      for (const f of ["price", "priceMax", "priceFrom", "currency", "durationMin", "bufferMin"] as Field[]) {
        const from = item[f];
        const to = offer[f];
        if (same(from, to)) continue;
        (syncFields.includes(f) ? diffs : info).push({ field: f, from, to });
      }
      if (diffs.length || info.length) out.push({ row, diffs, info });
    }
    out.sort(
      (a, b) =>
        a.row.catOrder - b.row.catOrder ||
        a.row.catTitle.localeCompare(b.row.catTitle, "bg") ||
        a.row.item.name.localeCompare(b.row.item.name, "bg"),
    );
    return { out, warnings };
  }

  const rows = await load();
  const { out, warnings } = computeDiffs(rows);
  warnings.forEach((w) => console.warn("⚠ " + w));

  // 3. Таблица.
  console.log("категория | услуга | поле | каталог → оферта");
  let fieldsToUpdate = 0;
  let servicesWithDiff = 0;
  const suspicious: string[] = [];
  for (const { row, diffs } of out) {
    if (!diffs.length) continue;
    servicesWithDiff++;
    for (const d of diffs) {
      fieldsToUpdate++;
      console.log(`${row.catTitle} | ${row.item.name} | ${d.field} | ${fmt(d.from)} → ${fmt(d.to)}`);
      // Защита срещу typo в PWA: само за цена, при старо > 0.
      if (d.field === "price" && typeof d.from === "number" && typeof d.to === "number" && d.from > 0) {
        const ratio = d.to / d.from;
        if (ratio > 3 || ratio < 1 / 3) {
          suspicious.push(`${row.catTitle} | ${row.item.name} | price | ${d.from} → ${d.to} (x${ratio.toFixed(2)})`);
        }
      }
    }
  }
  const infoRows = out.filter((o) => o.info.length);
  if (infoRows.length) {
    console.log("\nINFO (не се синхронизира без --all-fields): категория | услуга | поле | каталог → оферта");
    for (const { row, info } of infoRows) {
      for (const d of info) console.log(`${row.catTitle} | ${row.item.name} | ${d.field} | ${fmt(d.from)} → ${fmt(d.to)}`);
    }
  }

  console.log(`\nПроверени услуги: ${rows.length}, с разлики: ${servicesWithDiff}, полета за обновяване: ${fieldsToUpdate}`);

  if (suspicious.length) {
    console.log("\n⚠ подозрително (промяна над 3x или под 1/3):");
    suspicious.forEach((s) => console.log("  " + s));
  }

  // 4. Хайр услуги в каталога без активна оферта (само информация).
  const offeredIds = new Set(rows.map((r) => r.item.id));
  const hairCatalog = await db
    .select({ item: serviceItems, catTitle: serviceCategories.title, catSlug: serviceCategories.slug })
    .from(serviceItems)
    .innerJoin(serviceCategories, eq(serviceItems.categoryId, serviceCategories.id))
    .where(inArray(serviceCategories.slug, HAIR_SLUGS));
  const noOffer = hairCatalog
    .filter((h) => !offeredIds.has(h.item.id))
    .sort((a, b) => a.catTitle.localeCompare(b.catTitle, "bg") || a.item.name.localeCompare(b.item.name, "bg"));
  console.log(`\nФризьорски услуги в каталога БЕЗ активна оферта на ${res.name} (базовата цена е само каталожна): ${noOffer.length}`);
  for (const h of noOffer) {
    const pr = `${h.item.price}${h.item.priceMax != null ? `–${h.item.priceMax}` : ""}${h.item.priceFrom ? " (от)" : ""} ${h.item.currency}`;
    console.log(`  ${h.catTitle} | ${h.item.name} | ${pr}`);
  }

  if (!APPLY) {
    console.log("\nDRY-RUN. Пусни с --apply");
    process.exit(0);
  }

  // 5. Apply.
  if (suspicious.length && !FORCE) {
    console.error("\nОТКАЗ: има подозрителни промени. Провери цените в PWA или пусни с --force.");
    process.exit(2);
  }
  if (fieldsToUpdate === 0) {
    console.log("\nНищо за обновяване.");
    process.exit(0);
  }

  await db.transaction(async (tx) => {
    for (const { row, diffs } of out) {
      if (!diffs.length) continue;
      const patch: Record<string, unknown> = {};
      for (const d of diffs) patch[d.field] = d.to;
      await tx.update(serviceItems).set(patch).where(eq(serviceItems.id, row.item.id));
    }
  });

  const after = computeDiffs(await load());
  const remaining = after.out.reduce((n, o) => n + o.diffs.length, 0);
  console.log(`\nслед: оставащи разлики в синхронизираните полета: ${remaining}`);
  if (remaining !== 0) {
    console.error("Верификацията не мина.");
    process.exit(3);
  }
  console.log("ПРИЛОЖЕНО.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
