/* eslint-disable no-console */
// Journey: /admin/team и /admin/testimonials наистина стигат до публичната /za-nas.
// Екип: добавяне -> вижда се на /za-nas -> редакция на био -> изтриване -> изчезва.
// Отзив: добавяне (одобрен) -> вижда се -> изтриване -> изчезва.
// Пускане: JOURNEY_BASE=https://www.euphoriabeauty.eu JOURNEY_ADMIN_EMAIL=.. JOURNEY_ADMIN_PASSWORD=.. node scripts/journey-team-admin.mjs
// Акаунт: scripts/_journey-admin-user.ts (create | delete). Скриптът трие записите си и при провал.
import { chromium } from "@playwright/test";

const BASE = process.env.JOURNEY_BASE ?? "http://localhost:3000";
const A = { email: process.env.JOURNEY_ADMIN_EMAIL, password: process.env.JOURNEY_ADMIN_PASSWORD };
if (!A.email || !A.password) {
  console.error("⛔ Липсват JOURNEY_ADMIN_* env.");
  process.exit(1);
}

const NAME = "Journey Test";
const QUOTE = "Временен отзив за проверка на връзката с базата";
const BIO1 = "Временен запис за проверка";
const BIO2 = "Временен запис, редактиран";

const step = (name, ok, detail = "") => {
  console.log(`${ok ? "✅" : "⛔"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) throw new Error(`FAIL: ${name}`);
};

// ISR/кеш: ревалидацията е асинхронна, затова опитваме до ~20 сек.
async function za(expectPresent, text) {
  for (let i = 0; i < 10; i++) {
    const r = await fetch(`${BASE}/za-nas?cb=${Date.now()}`, { cache: "no-store" });
    const html = await r.text();
    if (html.includes(text) === expectPresent) return true;
    await new Promise((res) => setTimeout(res, 2000));
  }
  return false;
}

// Етикетите във формите не са вързани с htmlFor, затова търсим блока с точния label.
const field = (dialog, label) =>
  dialog
    .locator("div.space-y-2")
    .filter({ has: dialog.page().locator("label", { hasText: new RegExp(`^${label}$`) }) })
    .locator("input,textarea")
    .first();

async function deleteRow(page, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  const row = page.locator("tr", { hasText: NAME }).first();
  if ((await row.count()) === 0) return false;
  await row.getByRole("button", { name: "Изтрий" }).click();
  await page.locator("tr", { hasText: NAME }).first().waitFor({ state: "detached", timeout: 15000 });
  return true;
}

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
page.on("dialog", (d) => d.accept()); // window.confirm в DeleteButton
let teamCreated = false;
let testimonialCreated = false;

try {
  await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle" }); // клик преди хидратация = изгубен submit
  await page.fill("#email", A.email);
  await page.fill("#password", A.password);
  await page.click("form button[type=submit]");
  await page.waitForURL(/\/admin(?!\/login)/, { timeout: 20000 });
  step("Admin вход", true);

  // ---------- ЕКИП ----------
  await page.goto(`${BASE}/admin/team`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Нов член" }).click();
  let dlg = page.getByRole("dialog").filter({ hasText: "Нов член на екипа" });
  await dlg.waitFor({ timeout: 10000 });
  await field(dlg, "Име").fill(NAME);
  await field(dlg, "Опит").fill("1 година");
  await field(dlg, "Роля / позиция").fill("Тест");
  await field(dlg, "Био").fill(BIO1);
  // Снимката се оставя празна; „Активен“ е включен по подразбиране
  await dlg.getByRole("button", { name: "Запази" }).click();
  teamCreated = true;
  await page.locator("tr", { hasText: NAME }).first().waitFor({ timeout: 15000 });
  step("Екип: членът е добавен в /admin/team", true);
  step("Екип: „Journey Test“ се вижда на /za-nas", await za(true, NAME));

  await page.locator("tr", { hasText: NAME }).first().getByRole("button", { name: "Редакция" }).click();
  dlg = page.getByRole("dialog").filter({ hasText: "Редакция на член" });
  await dlg.waitFor({ timeout: 10000 });
  await field(dlg, "Био").fill(BIO2);
  await dlg.getByRole("button", { name: "Запази" }).click();
  await dlg.waitFor({ state: "hidden", timeout: 15000 });
  step("Екип: новото био се вижда на /za-nas", await za(true, BIO2));

  step("Екип: изтрит през админ", await deleteRow(page, "/admin/team"));
  teamCreated = false;
  step("Екип: „Journey Test“ е изчезнал от /za-nas", await za(false, NAME));

  // ---------- ОТЗИВИ ----------
  await page.goto(`${BASE}/admin/testimonials`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Нов отзив" }).click();
  dlg = page.getByRole("dialog").filter({ hasText: "Нов отзив" });
  await dlg.waitFor({ timeout: 10000 });
  await field(dlg, "Клиент \\(име\\)").fill(NAME);
  await field(dlg, "Инициали \\(за аватара\\)").fill("JT");
  await field(dlg, "Услуга").fill("Тест");
  await field(dlg, "Цитат").fill(QUOTE);
  // „Одобрен“ е включен по подразбиране (switch#approved)
  await dlg.getByRole("button", { name: "Запази" }).click();
  testimonialCreated = true;
  await page.locator("tr", { hasText: NAME }).first().waitFor({ timeout: 15000 });
  step("Отзив: добавен в /admin/testimonials", true);
  step("Отзив: цитатът се вижда на /za-nas", await za(true, QUOTE));

  step("Отзив: изтрит през админ", await deleteRow(page, "/admin/testimonials"));
  testimonialCreated = false;
  step("Отзив: цитатът е изчезнал от /za-nas", await za(false, QUOTE));

  console.log(`\nPASS: journey-team-admin (${BASE})`);
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  // Почистване при провал: същият път през админ UI; ако и той не успее, казваме точно какво остава.
  for (const [flag, path, label] of [
    [teamCreated, "/admin/team", "екип"],
    [testimonialCreated, "/admin/testimonials", "отзив"],
  ]) {
    if (!flag) continue;
    try {
      await deleteRow(page, path);
      console.log(`↷ Почистено: ${label} „${NAME}“`);
    } catch {
      console.error(`⚠ ОСТАТЪК за ръчно трийне: ${path} -> ред „${NAME}“ (${label})`);
    }
  }
  await browser.close();
}
