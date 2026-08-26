/* eslint-disable no-console */
// Journey: редакция на ЧЗВ от админа до КРАЙНИЯ ефект на публичния сайт.
// Създава временен админ акаунт (истинската парола не е в .env.local), влиза през
// формата, редактира въпроса за плащане, проверява началната страница (видим
// accordion + FAQPage JSON-LD), връща оригинала и трие временния акаунт.
// Пускане: JOURNEY_BASE=http://localhost:3007 npx tsx scripts/journey-admin-faq.ts
import { config } from "dotenv";
config({ path: ".env.local" });
import { chromium } from "@playwright/test";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";

const BASE = process.env.JOURNEY_BASE ?? "http://localhost:3000";
const QUESTION = "Как се плаща в салона?";
const MARKER = `ПРОВЕРКА-${Date.now()}`;
const TEMP_EMAIL = `journey-${Date.now()}@level8.local`;
const TEMP_PASS = `Jn-${nanoid(20)}-9A!`;

const step = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "✅" : "⛔"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) throw new Error(`FAIL: ${name}`);
};

async function main() {
  const { db, schema } = await import("../src/lib/db");
  const { auth } = await import("../src/lib/auth");

  // ── Временен админ (трие се в finally) ────────────────────────────────────
  const ctx = await auth.$context;
  const userId = nanoid();
  const now = new Date();
  await db.insert(schema.user).values({
    id: userId, name: "Journey bot", email: TEMP_EMAIL, emailVerified: true,
    role: "admin", createdAt: now, updatedAt: now,
  });
  await db.insert(schema.account).values({
    id: nanoid(), accountId: userId, providerId: "credential", userId,
    password: await ctx.password.hash(TEMP_PASS), createdAt: now, updatedAt: now,
  });
  console.log(`ℹ️ временен админ: ${TEMP_EMAIL}`);

  const browser = await chromium.launch();
  const page = await browser.newPage();
  let original: string | null = null;

  /** Публичната начална, прясна заявка; повтаря, докато revalidate-ът мине. */
  const homeContains = async (needle: string, tries = 12) => {
    for (let i = 0; i < tries; i++) {
      const res = await page.request.get(`${BASE}/`, { headers: { "cache-control": "no-cache" } });
      const html = await res.text();
      if (html.includes(needle)) return html;
      await new Promise((r) => setTimeout(r, 700));
    }
    return null;
  };

  try {
    await page.goto(`${BASE}/admin/login`, { waitUntil: "domcontentloaded" });
    await page.fill("#email", TEMP_EMAIL);
    await page.fill("#password", TEMP_PASS);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin(\/(?!login).*)?$/, { timeout: 20000 });
    step("Вход в /admin", true, TEMP_EMAIL);

    await page.goto(`${BASE}/admin/faq`, { waitUntil: "domcontentloaded" });
    const row = page.locator("tr", { hasText: QUESTION });
    step("Въпросът е в админ списъка", (await row.count()) === 1, QUESTION);

    await row.getByRole("button", { name: "Редакция" }).click();
    const ta = page.locator('[role="dialog"] textarea');
    await ta.waitFor({ state: "visible", timeout: 10000 });
    original = await ta.inputValue();
    step("Формата зарежда текущия отговор", original.length > 10, `${original.slice(0, 45)}…`);

    await ta.fill(`${original} ${MARKER}`);
    await page.locator('[role="dialog"] button[type="submit"]').click();
    await page.locator('[role="dialog"]').waitFor({ state: "hidden", timeout: 20000 });
    step("Запазено от админ формата", true, `маркер ${MARKER}`);

    const html = await homeContains(MARKER);
    step("Началната страница показва редакцията", html !== null);
    const hits = html!.split(MARKER).length - 1;
    step("Маркерът е и във видимия accordion, и в FAQPage JSON-LD", hits >= 2, `${hits} срещания`);

    await page.goto(`${BASE}/admin/faq`, { waitUntil: "domcontentloaded" });
    await page.locator("tr", { hasText: QUESTION }).getByRole("button", { name: "Редакция" }).click();
    const ta2 = page.locator('[role="dialog"] textarea');
    await ta2.waitFor({ state: "visible", timeout: 10000 });
    await ta2.fill(original);
    await page.locator('[role="dialog"] button[type="submit"]').click();
    await page.locator('[role="dialog"]').waitFor({ state: "hidden", timeout: 20000 });

    const restored = await homeContains(original);
    step("Оригиналът е върнат и се вижда на сайта", restored !== null);
    step("Маркерът е изчистен от сайта", !restored!.includes(MARKER));

    console.log("\n✅ Журнито мина: админ редакция → жив сайт → обратно.");
  } finally {
    await browser.close();
    // Ако редакцията е останала с маркер (падане по средата) — връщаме я от базата.
    if (original) {
      await db.update(schema.faqItems).set({ answer: original }).where(eq(schema.faqItems.question, QUESTION));
    }
    await db.delete(schema.session).where(eq(schema.session.userId, userId));
    await db.delete(schema.account).where(eq(schema.account.userId, userId));
    await db.delete(schema.user).where(eq(schema.user.id, userId));
    console.log(`🧹 временният админ е изтрит (${TEMP_EMAIL})`);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(`\n⛔ ${e.message}`); process.exit(1); });
