/* eslint-disable no-console */
// Journey: поясненията „?“ и новите валидации в /admin/services и /staff/services на живо.
// Admin: диалог „Редакция на услуга“ → „?“ бутони → балонче с текст → престой 5 → сървърът отказва
// с „Престой до 10 минути…“ (нищо не се записва). Staff: „Предлагам“ на първа услуга (временен
// неактивен изпълнител) → редакция → „?“ → продължителност 7 → „стъпки от 5“.
// Пускане: JOURNEY_BASE=https://www.euphoriabeauty.eu JOURNEY_ADMIN_EMAIL=.. JOURNEY_ADMIN_PASSWORD=..
//          JOURNEY_STAFF_EMAIL=.. JOURNEY_STAFF_PASSWORD=.. node scripts/journey-service-hints.mjs
// Акаунтите: scripts/_journey-admin-user.ts и scripts/_journey-staff-user.ts (create | delete).
import { chromium } from "@playwright/test";

const BASE = process.env.JOURNEY_BASE ?? "http://localhost:3000";
const A = { email: process.env.JOURNEY_ADMIN_EMAIL, password: process.env.JOURNEY_ADMIN_PASSWORD };
const S = { email: process.env.JOURNEY_STAFF_EMAIL, password: process.env.JOURNEY_STAFF_PASSWORD };
const SHOT = process.env.JOURNEY_SHOT_DIR ?? "";
if (!A.email || !A.password || !S.email || !S.password) {
  console.error("⛔ Липсват JOURNEY_ADMIN_* / JOURNEY_STAFF_* env.");
  process.exit(1);
}

const step = (name, ok, detail = "") => {
  console.log(`${ok ? "✅" : "⛔"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) throw new Error(`FAIL: ${name}`);
};
const toastText = async (page, re) => {
  const t = page.locator("[data-sonner-toast]").filter({ hasText: re }).first();
  await t.waitFor({ timeout: 10000 });
  return (await t.textContent())?.trim();
};
const shot = async (page, name) => {
  if (SHOT) await page.screenshot({ path: `${SHOT}/${name}.png` });
};

const browser = await chromium.launch();
try {
  // ---------- ADMIN ----------
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle" }); // клик преди хидратация = изгубен submit
  await page.fill("#email", A.email);
  await page.fill("#password", A.password);
  await page.click("button[type=submit]");
  await page.waitForURL(/\/admin(?!\/login)/, { timeout: 20000 });
  step("Admin вход", true);

  await page.goto(`${BASE}/admin/services`);
  const catLink = page.locator('a[href^="/admin/services/"]').first();
  await catLink.waitFor({ timeout: 15000 });
  await catLink.click();
  await page.waitForURL(/\/admin\/services\/[^/]+$/, { timeout: 15000 });
  const edit = page.getByRole("button", { name: "Редакция" }).first();
  await edit.waitFor({ timeout: 15000 });
  await edit.click();
  const dialog = page.getByRole("dialog").filter({ hasText: "Редакция на услуга" });
  await dialog.waitFor({ timeout: 10000 });
  step("Admin: диалог „Редакция на услуга“ отворен", true);

  const hints = dialog.locator('button[aria-label^="Пояснение: "]');
  const n = await hints.count();
  step("Admin: бутони „?“ във формата (очаквани ≥ 10)", n >= 10, `${n}`);
  step(
    "Admin: етикетът е „Показва се на сайта и в онлайн записването“",
    (await dialog.getByText("Показва се на сайта и в онлайн записването").count()) === 1,
  );

  await dialog.locator('button[aria-label="Пояснение: Минути престой"]').click();
  const pop = page.locator('[data-slot="field-hint-content"]');
  await pop.waitFor({ timeout: 5000 });
  const popText = (await pop.textContent()) ?? "";
  step(
    "Admin: балончето показва текста за престой",
    /Минути престой/.test(popText) && /над 10 минути/.test(popText),
    popText.slice(0, 70) + "…",
  );
  await shot(page, "admin-hint-open");
  await page.keyboard.press("Escape"); // затваря балончето (горният слой), не диалога
  await pop.waitFor({ state: "hidden", timeout: 5000 });
  step("Admin: Escape затваря балончето, диалогът остава", await dialog.isVisible());

  const before = {
    active: await dialog.locator("#si-active").inputValue(),
    proc: await dialog.locator("#si-processing").inputValue(),
  };
  await dialog.locator("#si-active").fill("0");
  await dialog.locator("#si-processing").fill("5");
  await dialog.getByRole("button", { name: "Запази" }).click();
  const t1 = await toastText(page, /Престой до 10 минути/);
  step("Admin: престой 5 → сървърът отказва с ясно съобщение", !!t1, t1);
  step("Admin: диалогът остава отворен след грешка (нищо не е записано)", await dialog.isVisible());
  await shot(page, "admin-validation-error");
  await dialog.locator("#si-active").fill(before.active);
  await dialog.locator("#si-processing").fill(before.proc);
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden", timeout: 5000 });
  await page.context().close();

  // ---------- STAFF (телефон, тъч) ----------
  const sp = await (
    await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  ).newPage();
  await sp.goto(`${BASE}/staff/login`, { waitUntil: "networkidle" });
  await sp.fill("#email", S.email);
  await sp.fill("#password", S.password);
  // Само бутонът на формата: InstallBanner-ът има „Скрий" без type → също submit и хваща първия мач.
  await sp.locator("form button[type=submit]").click();
  await sp.waitForURL(/\/staff(?!\/login)/, { timeout: 20000 });
  step("Staff вход (телефон, тъч)", true);

  await sp.goto(`${BASE}/staff/services`);
  const offerSwitch = sp.getByRole("switch", { name: "Предлагам" }).first();
  await offerSwitch.waitFor({ timeout: 15000 });
  const offerRow = sp.locator("div.rounded-xl").filter({ has: offerSwitch }).first();
  const svcName = (await offerRow.locator("p.font-semibold").first().textContent())?.trim() ?? "";
  if ((await offerSwitch.getAttribute("aria-checked")) !== "true") {
    await offerSwitch.tap();
    await sp.waitForTimeout(1500);
  }
  step("Staff: „Предлагам“ включено за временния изпълнител", (await offerSwitch.getAttribute("aria-checked")) === "true", svcName);
  const offerHint = offerRow.locator('button[aria-label="Пояснение: Предлагам"]');
  step("Staff: „?“ до „Предлагам“ в списъка", (await offerHint.count()) === 1);

  await offerRow.getByRole("button", { name: svcName }).tap();
  const sheet = sp.getByRole("dialog");
  await sheet.waitFor({ timeout: 10000 });
  const sn = await sheet.locator('button[aria-label^="Пояснение: "]').count();
  step("Staff: бутони „?“ в редакцията (очаквани ≥ 5)", sn >= 5, `${sn}`);
  await sheet.locator('button[aria-label="Пояснение: Минути престой"]').tap();
  const spop = sp.locator('[data-slot="field-hint-content"]');
  await spop.waitFor({ timeout: 5000 });
  const spopText = (await spop.textContent()) ?? "";
  step("Staff: тап на „?“ отваря балончето на телефон", /важи за всички/.test(spopText), spopText.slice(0, 60) + "…");
  await shot(sp, "staff-hint-open");
  await sp.keyboard.press("Escape");
  await spop.waitFor({ state: "hidden", timeout: 5000 });

  await sheet.locator("#ms-duration").fill("7");
  await sheet.getByRole("button", { name: "Запази" }).tap();
  const t2 = await toastText(sp, /стъпки от 5/);
  step("Staff: продължителност 7 → „стъпки от 5“", !!t2, t2);
  await shot(sp, "staff-validation-error");
  await sp.context().close();

  console.log(`\nPASS: journey-service-hints (${BASE})`);
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
