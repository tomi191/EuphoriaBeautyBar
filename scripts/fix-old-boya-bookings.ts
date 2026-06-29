/**
 * Презаписва бъдещите часове със старата „Боядисване" (0/0) към „Боядисване
 * (средна коса)" (active 25 / престой 40) — за да отворят паралел. Ако средната
 * липсва в каталога (има само къса/дълга), я СЪЗДАВА. Запазва startAt/endAt на
 * часовете (само сменя услугата + active/processing), за да не мести края.
 *
 * DRY-RUN: npx tsx --env-file=.env.local scripts/fix-old-boya-bookings.ts
 * APPLY:   npx tsx --env-file=.env.local scripts/fix-old-boya-bookings.ts --apply
 */
import { nanoid } from "nanoid";
import { and, eq } from "drizzle-orm";
import { db, schema } from "../src/lib/db";

const APPLY = process.argv.includes("--apply");
const RES = "res-snezhana";

async function main() {
  let mid = await db.query.serviceItems.findFirst({ where: (s, { eq }) => eq(s.name, "Боядисване (средна коса)") });

  if (!mid) {
    const kratka = await db.query.serviceItems.findFirst({ where: (s, { eq }) => eq(s.name, "Боядисване (къса коса)") });
    if (!kratka) throw new Error("Няма „Боядисване (къса коса)“ за референция.");
    console.log(`➕ „Боядисване (средна коса)" липсва — ${APPLY ? "създавам" : "(DRY-RUN) ще създам"} (85 мин, active 25 / престой 40, „от 50€", в група „Боядисване").`);
    if (APPLY) {
      const id = nanoid();
      await db.insert(schema.serviceItems).values({
        id, categoryId: kratka.categoryId, groupTitle: "Боядисване",
        name: "Боядисване (средна коса)", price: 50, priceMax: null, priceFrom: true,
        currency: kratka.currency, duration: null, description: null,
        sortOrder: 115, durationMin: 85, bufferMin: 15, activeMin: 25, processingMin: 40,
        bookableOnline: true,
      });
      await db.insert(schema.resourceServices).values({
        id: nanoid(), resourceId: RES, serviceItemId: id, price: 50, priceMax: null, priceFrom: true,
        currency: kratka.currency, durationMin: 85, bufferMin: 15, active: true, createdAt: new Date(), updatedAt: new Date(),
      });
      mid = await db.query.serviceItems.findFirst({ where: (s, { eq }) => eq(s.id, id) });
    }
  }
  const midActive = mid?.activeMin ?? 25;
  const midProc = mid?.processingMin ?? 40;
  const midId = mid?.id ?? "(нова)";
  const midName = "Боядисване (средна коса)";

  const old = await db.query.serviceItems.findFirst({ where: (s, { and, eq }) => and(eq(s.name, "Боядисване"), eq(s.groupTitle, "Архив")) });
  if (!old) { console.log("Няма стара архивна „Боядисване“."); process.exit(0); }

  const now = new Date();
  const all = (await db.query.bookings.findMany({ where: (b, { eq }) => eq(b.serviceItemId, old.id) })).filter((b) => b.startAt >= now);
  const minBlock = midActive + midProc; // престоят се събира само ако блокът е поне толкова
  const blockMin = (b: (typeof all)[number]) => Math.round((b.endAt.getTime() - b.startAt.getTime()) / 60000);
  const future = all.filter((b) => blockMin(b) >= minBlock);
  const tooShort = all.filter((b) => blockMin(b) < minBlock);

  console.log(`\n${APPLY ? "🟢 APPLY" : "🔍 DRY-RUN"} — презапис на ${future.length} бъдещи часа → „${midName}" (active=${midActive}, престой=${midProc}):\n`);
  for (const b of future) {
    console.log(`  ${b.startAt.toISOString().slice(0, 10)} ${b.startAt.toISOString().slice(11, 16)}Z (блок ${blockMin(b)} мин запазен) → +престой`);
  }
  if (tooShort.length) {
    console.log(`\n⚠️  Пропуснати (блок < ${minBlock} мин — престой не се събира, Снежана да провери ръчно):`);
    for (const b of tooShort) console.log(`  ${b.startAt.toISOString().slice(0, 10)} ${b.startAt.toISOString().slice(11, 16)}Z (само ${blockMin(b)} мин)`);
  }
  if (!APPLY) { console.log(`\n👉 DRY-RUN — нищо не е записано.\n`); process.exit(0); }

  for (const b of future) {
    await db.update(schema.bookings).set({
      serviceItemId: midId, serviceName: midName, activeMin: midActive, processingMin: midProc, updatedAt: new Date(),
    }).where(and(eq(schema.bookings.id, b.id)));
  }
  console.log(`\n✅ Презаписани ${future.length} часа — вече отварят паралел.\n`);
  process.exit(0);
}

main().catch((e) => { console.error("✗", e.message ?? e); process.exit(1); });
