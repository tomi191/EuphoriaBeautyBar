/* eslint-disable no-console */
// Journey (публична галерия): /galeriya рендира снимките от БД с реалните им описания →
// филтърът „Грим“ съществува и показва само грим → lightbox-ът показва описанието като caption.
// Договор за внос на снимки (напр. scripts/import-gallery-2026-09.ts): без deploy/revalidate
// страницата е СТАТИЧНА и не ги показва — този скрипт го хваща (виж стъпка 1).
// Пускане: node scripts/journey-gallery-public.mjs            (localhost:3000)
//          JOURNEY_BASE=https://www.euphoriabeauty.eu node scripts/journey-gallery-public.mjs
import { chromium } from "@playwright/test";

const BASE = process.env.JOURNEY_BASE ?? "http://localhost:3000";
// Котви от вноса 09.09.2026 — реални описания, които трябва да са в HTML-а.
const EXPECT_ALTS = [
  "Боядисване в цвят бордо на дълга права коса",
  "Гримьорският кът в салона",
  "Платинено русо на къса коса с плажни вълни",
];
const EXPECT_GRIM_COUNT = 6;

const step = (name, ok, detail = "") => {
  console.log(`${ok ? "✅" : "⛔"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) throw new Error(`FAIL: ${name}`);
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
try {
  // 1. HTML източникът (не браузърът) носи реалните описания като alt
  const html = await (await fetch(`${BASE}/galeriya`)).text();
  for (const a of EXPECT_ALTS) step(`HTML alt: „${a}“`, html.includes(a));
  const storageCount = new Set(html.match(/gu-[A-Za-z0-9_-]{10}\.webp/g) ?? []).size;
  step("Storage снимки в HTML ≥ 37 (20 стари + 17 нови)", storageCount >= 37, `${storageCount}`);

  // 2. Филтърът „Грим“ съществува и филтрира
  await page.goto(`${BASE}/galeriya`, { waitUntil: "networkidle" });
  const grimBtn = page.getByRole("button", { name: "Грим", exact: true });
  step("Бутон-филтър „Грим“ съществува", (await grimBtn.count()) === 1);
  const totalBefore = await page.locator('div.columns-2 button[aria-label^="Отвори"]').count();
  await grimBtn.click();
  await page.waitForTimeout(900); // AnimatePresence exit анимация
  const grimCount = await page.locator('div.columns-2 button[aria-label^="Отвори"]').count();
  step(`Филтър „Грим“ показва ${EXPECT_GRIM_COUNT} снимки`, grimCount === EXPECT_GRIM_COUNT, `${grimCount} от ${totalBefore} общо`);

  // 3. Lightbox: клик на първата → caption = описанието
  const first = page.locator('div.columns-2 button[aria-label^="Отвори"]').first();
  const firstAlt = (await first.getAttribute("aria-label")).replace(/^Отвори /, "");
  await first.click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor({ timeout: 5000 });
  const caption = (await dialog.locator("p").first().textContent())?.trim();
  step("Lightbox caption = описанието на снимката", caption === firstAlt, caption);
  const imgSrc = await dialog.locator("img").first().getAttribute("src");
  step("Lightbox снимката е от Storage bucket gallery", /\/storage\/v1\/object\/public\/gallery\/gu-/.test(imgSrc ?? ""), imgSrc);
  await page.getByRole("button", { name: "Затвори" }).click();
  await dialog.waitFor({ state: "hidden", timeout: 5000 });
  step("Lightbox се затваря", true);

  // 4. Началната страница също чете БД (същият клас кеш)
  const home = await (await fetch(`${BASE}/`)).text();
  step("Начална страница носи поне една нова снимка", EXPECT_ALTS.some((a) => home.includes(a)) || /gu-(_fMHth4hbF|amhyz1uyB9|cB1jV0pSYD)/.test(home), "");

  console.log("\nPASS: journey-gallery-public");
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
