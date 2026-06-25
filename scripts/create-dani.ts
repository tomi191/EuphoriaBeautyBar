/**
 * Създава маникюристката Дани като изпълнител (resource kind=nails), със staff
 * вход, но СКРИТА от онлайн booking (active=false → не е в performers; staff
 * входът работи, защото requireStaff гледа само userId). Дава ѝ оферти за
 * маникюр/педикюр услугите. Идемпотентно. НЕ се пуска от агента (production DB).
 *
 * Пускане: npx tsx --env-file=.env.local scripts/create-dani.ts
 */
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { db, schema } from "../src/lib/db";
import { auth } from "../src/lib/auth";

const EMAIL = "dani@euphoriabeauty.eu";
const PASSWORD = process.env.DANI_PASSWORD; // подава се през env, не се hardcode-ва (public repo)
const NAME = "Дани";

async function main() {
  if (!PASSWORD) {
    console.error("✗ Задай DANI_PASSWORD (напр. DANI_PASSWORD=… npx tsx --env-file=.env.local scripts/create-dani.ts)");
    process.exit(1);
  }
  // 1. Resource Дани (nails, active=false → скрита онлайн; staff входът работи).
  let resource = await db.query.resources.findFirst({ where: (r, { eq }) => eq(r.name, NAME) });
  let resourceId: string;
  if (resource) {
    resourceId = resource.id;
    await db.update(schema.resources).set({ kind: "nails", active: false }).where(eq(schema.resources.id, resourceId));
    console.log(`Resource „${NAME}" вече съществува (${resourceId}) — потвърден nails/active=false`);
  } else {
    resourceId = nanoid();
    await db.insert(schema.resources).values({
      id: resourceId, name: NAME, kind: "nails", active: false,
      bio: "Маникюр и педикюр в Euphoria Hair & Beauty Bar", color: "#d8a7b1", sortOrder: 1,
      createdAt: new Date(), updatedAt: new Date(),
    });
    console.log(`+ Resource „${NAME}" (nails, active=false → скрита от онлайн booking)`);
  }

  // 2. Staff акаунт (user + account) — само ако още няма вход.
  resource = await db.query.resources.findFirst({ where: (r, { eq }) => eq(r.id, resourceId) });
  if (!resource!.userId) {
    const existing = await db.query.user.findFirst({ where: (u, { eq }) => eq(u.email, EMAIL) });
    if (existing) {
      console.warn(`⚠ имейл ${EMAIL} вече зает — свързвам съществуващия user`);
      await db.update(schema.resources).set({ userId: existing.id, updatedAt: new Date() }).where(eq(schema.resources.id, resourceId));
    } else {
      const ctx = await auth.$context;
      const hashed = await ctx.password.hash(PASSWORD);
      const userId = nanoid();
      const now = new Date();
      await db.insert(schema.user).values({ id: userId, name: NAME, email: EMAIL, emailVerified: true, role: "staff", createdAt: now, updatedAt: now });
      await db.insert(schema.account).values({ id: nanoid(), accountId: userId, providerId: "credential", userId, password: hashed, createdAt: now, updatedAt: now });
      await db.update(schema.resources).set({ userId, updatedAt: now }).where(eq(schema.resources.id, resourceId));
      console.log(`+ Staff вход ${EMAIL}`);
    }
  } else {
    console.log("Вход вече е вързан — пропускам.");
  }

  // 3. Оферти (resourceServices) — Дани предлага всички онлайн маникюр/педикюр услуги.
  const cat = await db.query.serviceCategories.findFirst({ where: (c, { eq }) => eq(c.slug, "manikyur-i-pedikyur") });
  if (!cat) { console.error("✗ категория manikyur-i-pedikyur липсва"); process.exit(1); }
  const nailItems = await db.query.serviceItems.findMany({
    where: (s, { and, eq }) => and(eq(s.categoryId, cat.id), eq(s.bookableOnline, true)),
  });
  let added = 0;
  for (const item of nailItems) {
    const has = await db.query.resourceServices.findFirst({
      where: (r, { and, eq }) => and(eq(r.resourceId, resourceId), eq(r.serviceItemId, item.id)),
    });
    if (!has) {
      await db.insert(schema.resourceServices).values({
        id: nanoid(), resourceId, serviceItemId: item.id,
        price: item.price, priceFrom: false, currency: item.currency,
        durationMin: item.durationMin, bufferMin: item.bufferMin, active: true,
      });
      added++;
    }
  }
  console.log(`  + ${added} оферти за маникюр/педикюр (${nailItems.length} услуги общо)`);
  console.log(`\n✅ Дани готова. Вход: ${EMAIL}. Скрита от онлайн (active=false), staff PWA работи.`);
  console.log(`   Иконката на таба Услуги е автоматично маникюр (nails HandHeart).`);
  console.log(`   Работно време: фолбек към салонното; Дани може да го зададе в staff PWA.`);
  process.exit(0);
}
main().catch((e) => { console.error("✗", e?.message ?? e); process.exit(1); });
