/**
 * Нормализира реда на ценоразписа: чисти групи (един тип услуга), подредба по
 * дължина (къса→средна→дълга), уникален стъпков sortOrder. Старите offline дубли
 * (без дължина) се отделят накрая.
 *
 * DRY-RUN (по подразбиране): npx tsx --env-file=.env.local scripts/normalize-catalog.ts
 * ПРИЛОЖИ:                   npx tsx --env-file=.env.local scripts/normalize-catalog.ts --apply
 */
import { db, schema } from "../src/lib/db";
import { eq } from "drizzle-orm";

const APPLY = process.argv.includes("--apply");

function lengthRank(name: string): number {
  if (/къса/i.test(name)) return 1;
  if (/средна/i.test(name)) return 2;
  if (/дълга/i.test(name)) return 3;
  return 0; // единична услуга без дължина
}
function baseType(name: string): string {
  return name.replace(/\s*\([^)]*коса\)\s*/i, " ").replace(/\s+/g, " ").trim();
}

/** Желан ред на групите + типовете в тях, per категория slug. */
const PLAN: Record<string, { group: string; types: string[] }[]> = {
  "frizorski-uslugi": [
    { group: "Подстригване и оформяне", types: ["Дамско подстригване", "Мъжко подстригване", "Сешоар", "Навиване с преса/букли", "Ретро вълни", "Официална прическа", "Рибена кост плитка", "Обикновена плитка"] },
    { group: "Боядисване", types: ["Боядисване", "Боя на салона 60мл"] },
    { group: "Кичури на фолио", types: ["Кичури на фолио"] },
    { group: "Балаяж", types: ["Балаяж"] },
    { group: "Корекция на цветовете", types: ["Корекция на цветовете"] },
    { group: "Перманентно къдрене", types: ["Къдрене в корена за обем", "Къдрене на коса до 15см.", "Къдрене на коса над 15см."] },
  ],
};

interface Row { id: string; name: string; groupTitle: string; sortOrder: number; bookableOnline: boolean; categoryId: string }

async function main() {
  const cats = await db.query.serviceCategories.findMany({ orderBy: (c, { asc }) => [asc(c.sortOrder)] });
  const items = (await db.query.serviceItems.findMany()) as unknown as Row[];

  const updates: { id: string; name: string; oldGroup: string; newGroup: string; oldSort: number; newSort: number }[] = [];
  const archived: Row[] = [];
  const untouched: Row[] = [];

  for (const c of cats) {
    const plan = PLAN[c.slug];
    const catItems = items.filter((i) => i.categoryId === c.id);
    if (catItems.length === 0) continue;
    // Стар offline дубликат = offline услуга, чийто базов тип има ONLINE версия
    // (напр. „Боядисване" 0/0 е заменено от „Боядисване (къса/средна/дълга)").
    const onlineBaseTypes = new Set(catItems.filter((i) => i.bookableOnline).map((i) => baseType(i.name)));
    const isStaleDup = (i: Row) => !i.bookableOnline && lengthRank(i.name) === 0 && onlineBaseTypes.has(baseType(i.name));

    if (!plan) {
      // Без план (Терапии/Маникюр/Козметика): запазваме групите, само преномерираме
      // реда (online първи, после по дължина, после име) + архивираме старите дубли.
      const groupOrder: string[] = [];
      const seen = new Set<string>();
      for (const i of catItems.slice().sort((a, b) => a.sortOrder - b.sortOrder)) {
        if (!seen.has(i.groupTitle)) { seen.add(i.groupTitle); groupOrder.push(i.groupTitle); }
      }
      let sortF = 0;
      for (const g of groupOrder) {
        const inGroup = catItems
          .filter((i) => i.groupTitle === g)
          .sort((a, b) => Number(b.bookableOnline) - Number(a.bookableOnline) || lengthRank(a.name) - lengthRank(b.name) || a.name.localeCompare(b.name, "bg"));
        for (const m of inGroup) {
          if (isStaleDup(m)) { archived.push(m); continue; }
          sortF += 10;
          updates.push({ id: m.id, name: m.name, oldGroup: m.groupTitle, newGroup: g, oldSort: m.sortOrder, newSort: sortF });
        }
      }
      continue;
    }

    let sort = 0;
    for (const g of plan) {
      for (const t of g.types) {
        const matches = catItems
          .filter((i) => baseType(i.name) === t || i.name === t)
          .sort((a, b) => lengthRank(a.name) - lengthRank(b.name) || a.name.localeCompare(b.name, "bg"));
        for (const m of matches) {
          if (isStaleDup(m)) { archived.push(m); continue; }
          sort += 10;
          updates.push({ id: m.id, name: m.name, oldGroup: m.groupTitle, newGroup: g.group, oldSort: m.sortOrder, newSort: sort });
        }
      }
    }

    // Услуги в категорията, които НЕ паднаха в нито един дефиниран тип
    const placed = new Set(updates.map((u) => u.id).concat(archived.map((a) => a.id)));
    for (const i of catItems) if (!placed.has(i.id)) untouched.push(i);
  }

  // ── Отчет ──
  console.log(`\n${APPLY ? "🟢 APPLY" : "🔍 DRY-RUN"} — нормализация на ценоразписа\n`);
  const byGroup = new Map<string, typeof updates>();
  for (const u of updates) { const a = byGroup.get(u.newGroup) ?? []; a.push(u); byGroup.set(u.newGroup, a); }
  for (const [g, us] of byGroup) {
    console.log(`▸ ${g}`);
    for (const u of us) console.log(`    [${String(u.newSort).padStart(3)}] ${u.name}  ${u.oldGroup !== u.newGroup ? `(беше: ${u.oldGroup})` : ""}`);
  }
  if (archived.length) {
    console.log(`\n🗄️  Стари offline дубли (остават offline, преместени в група „Архив"):`);
    for (const a of archived) console.log(`    - ${a.name}  (група: ${a.groupTitle})`);
  }
  if (untouched.length) {
    console.log(`\n⚪ Непроменени (извън плана — Терапии/непознати):`);
    for (const u of untouched) console.log(`    - ${u.name}  (${u.groupTitle})`);
  }
  console.log(`\nОбобщение: ${updates.length} за пренареждане, ${archived.length} за архив, ${untouched.length} непроменени.`);

  if (!APPLY) {
    console.log(`\n👉 DRY-RUN — нищо не е записано. Пусни с --apply за реална промяна.\n`);
    process.exit(0);
  }

  // ── Прилагане ──
  for (const u of updates) {
    await db.update(schema.serviceItems).set({ groupTitle: u.newGroup, sortOrder: u.newSort }).where(eq(schema.serviceItems.id, u.id));
  }
  for (const a of archived) {
    await db.update(schema.serviceItems).set({ groupTitle: "Архив", sortOrder: 9000 }).where(eq(schema.serviceItems.id, a.id));
  }
  console.log(`\n✅ Приложено: ${updates.length} обновени + ${archived.length} архивирани.\n`);
  process.exit(0);
}

main().catch((e) => { console.error("✗", e.message ?? e); process.exit(1); });
