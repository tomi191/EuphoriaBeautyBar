/* eslint-disable no-console */
/**
 * Решение 28: цените с центове → най-близкото кратно на 0,50 € (по средата нагоре), в двете таблици
 * (resource_services, service_items). Часовете (bookings) не се пипат: пазят цената си от записа.
 *
 *   npx tsx scripts/round-prices-to-50c.ts                       на сухо: само чете и печата таблицата
 *   npx tsx scripts/round-prices-to-50c.ts --out <файл.md>       таблицата и във файл
 *   npx tsx scripts/round-prices-to-50c.ts --env <път/.env.local> друга база (по подразбиране .env.local тук)
 *   npx tsx scripts/round-prices-to-50c.ts --apply               записва (пробна база)
 *
 * Записът минава през дневника на цените (0003_price_log.sql): source = 'script', changed_by = името на скрипта.
 * На база извън компютъра --apply иска и ROUND_PRICES_LIVE=da (думата на собственика за истинското пускане).
 * В таблицата няма лични данни: специалистът е «вид + пореден номер».
 */
import { writeFileSync } from "node:fs";
import { config } from "dotenv";

const args = process.argv.slice(2);
const opt = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const APPLY = args.includes("--apply");
config({ path: opt("--env") ?? ".env.local", quiet: true });

const ACTOR = "round-prices-to-50c";

(async () => {
  const host = new URL(process.env.DATABASE_URL ?? "postgresql://x@invalid/x").hostname;
  const local = ["127.0.0.1", "localhost"].includes(host);
  if (APPLY && !local && process.env.ROUND_PRICES_LIVE !== "da") {
    console.error("Отказ: --apply на база извън компютъра иска ROUND_PRICES_LIVE=da.");
    process.exit(1);
  }
  console.log(`База: ${local ? "пробна (на компютъра)" : "жива"} · ${APPLY ? "ЗАПИС" : "на сухо"}`);

  const { eq } = await import("drizzle-orm");
  const { db, schema } = await import("../src/lib/db");
  const { roundRow } = await import("../src/lib/pricing/round-price");
  const { formatServicePrice } = await import("../src/lib/booking/price");
  const { KIND_LABEL } = await import("../src/lib/booking/kind");
  const { withPriceLog } = await import("../src/lib/pricing/price-log");

  const [items, offers, resources] = await Promise.all([
    db.query.serviceItems.findMany(),
    db.query.resourceServices.findMany(),
    db.query.resources.findMany({ columns: { id: true, kind: true } }),
  ]);
  const itemName = new Map(items.map((i) => [i.id, i.name]));

  // «Специалист Коса 1»: пореден номер по вид, стабилен по id; без имена.
  const label = new Map<string, string>();
  const perKind = new Map<string, number>();
  for (const r of [...resources].sort((a, b) => a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id))) {
    const n = (perKind.get(r.kind) ?? 0) + 1;
    perKind.set(r.kind, n);
    label.set(r.id, `специалист ${KIND_LABEL[r.kind] ?? r.kind} ${n}`);
  }

  type Change = {
    table: "resource_services" | "service_items";
    id: string;
    service: string;
    who: string;
    old: { price: number; priceMax: number | null; priceFrom: boolean; currency: string };
    next: { price: number; priceMax: number | null };
  };
  const changes: Change[] = [];
  for (const i of items) {
    const next = roundRow(i);
    if (next) changes.push({ table: "service_items", id: i.id, service: i.name, who: "каталог", old: i, next });
  }
  for (const o of offers) {
    const next = roundRow(o);
    if (next) {
      changes.push({
        table: "resource_services",
        id: o.id,
        service: itemName.get(o.serviceItemId) ?? "(няма в каталога)",
        who: (label.get(o.resourceId) ?? "специалист ?") + (o.active ? "" : " (не я предлага)"),
        old: o,
        next,
      });
    }
  }
  changes.sort((a, b) => a.service.localeCompare(b.service, "bg") || a.who.localeCompare(b.who, "bg"));

  const leva = items.filter((i) => i.currency !== "€").length + offers.filter((o) => o.currency !== "€").length;
  const fmt = (p: { price: number; priceMax: number | null; priceFrom: boolean }) =>
    formatServicePrice({ ...p, currency: "€" });
  const money = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(2).replace(".", ",")} €`;
  const diff = (c: Change) => {
    const d = Math.round((c.next.price - c.old.price) * 100) / 100;
    const m = c.old.priceMax == null || c.next.priceMax == null ? 0 : Math.round((c.next.priceMax - c.old.priceMax) * 100) / 100;
    return m === 0 ? money(d) : `${money(d)}; горна граница ${money(m)}`;
  };
  const lines = [
    `| Услуга | При кого | Стара | Нова | Разлика |`,
    `|---|---|---|---|---|`,
    ...changes.map(
      (c) =>
        `| ${c.service} | ${c.who} | ${fmt(c.old)} | ${fmt({ ...c.next, priceFrom: c.old.priceFrom })} | ${diff(c)} |`,
    ),
  ];
  const up = changes.filter((c) => c.next.price > c.old.price).length;
  const down = changes.filter((c) => c.next.price < c.old.price).length;
  const summary = [
    `Цени в евро с центове (не на 0 или 50): ${changes.length} (в каталога ${changes.filter((c) => c.table === "service_items").length}, при специалист ${changes.filter((c) => c.table === "resource_services").length}).`,
    `Нагоре: ${up}, надолу: ${down}, само горната граница: ${changes.length - up - down}. Редове в лева (не са пипани): ${leva}.`,
  ];
  const out = [...summary, "", ...lines].join("\n");
  console.log(out);
  const outFile = opt("--out");
  if (outFile) writeFileSync(outFile, out + "\n", "utf8");

  if (!APPLY || changes.length === 0) process.exit(0);

  await withPriceLog("script", ACTOR, async (tx) => {
    const now = new Date();
    for (const c of changes) {
      if (c.table === "service_items") {
        await tx.update(schema.serviceItems).set(c.next).where(eq(schema.serviceItems.id, c.id));
      } else {
        await tx
          .update(schema.resourceServices)
          .set({ ...c.next, updatedAt: now })
          .where(eq(schema.resourceServices.id, c.id));
      }
    }
  });
  console.log(`Записано: ${changes.length} цени (в дневника source = script, changed_by = ${ACTOR}).`);
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
