/* eslint-disable no-console */
// Journey: шапката и таблиците на /admin (16.10.2026): лого в кутията + линк към таблото, камбанка
// с известия (панел, „Прочетени“), лепкава колона „Действия“ във всички таблици на desktop и телефон,
// непрозрачен hover, без хоризонтален скрол. Временен админ: scripts/_journey-admin-user.ts (create | delete).
// Пускане: JOURNEY_BASE=https://www.euphoriabeauty.eu JOURNEY_EMAIL=.. JOURNEY_PASSWORD=.. node scripts/journey-admin-shell.mjs
// Локално: next start е production → трябва NEXT_PUBLIC_SITE_URL/BETTER_AUTH_URL=http://localhost:3100 за better-auth.
// Внимание: стъпката „Прочетени“ записва admin_notifications_seen_at в site_settings; изтрий реда след теста.
import { chromium } from "@playwright/test";

const BASE = process.env.JOURNEY_BASE ?? "http://localhost:3100";
const A = { email: process.env.JOURNEY_EMAIL, password: process.env.JOURNEY_PASSWORD };
const SHOT = process.env.SHOT_DIR ?? "";
let fails = 0;
const step = (name, ok, detail = "") => {
  console.log(`${ok ? "✅" : "⛔"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) fails++;
};
const shot = async (page, name) => { if (SHOT) await page.screenshot({ path: `${SHOT}/${name}.png`, fullPage: true }); };

async function login(page) {
  await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle" });
  await page.fill("#email", A.email);
  await page.fill("#password", A.password);
  await page.click("button[type=submit]");
  await page.waitForURL(/\/admin(?!\/login)/, { timeout: 20000 });
}

// Логото: видимо, изцяло в кутията на родителя, линк към /admin.
async function checkLogo(page, label) {
  const info = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll('a[href="/admin"] img')].filter((i) => i.getClientRects().length > 0 && getComputedStyle(i).display !== "none");
    const img = imgs[0];
    if (!img) return null;
    const a = img.closest("a");
    const box = a.parentElement.getBoundingClientRect();
    const r = img.getBoundingClientRect();
    return {
      href: a.getAttribute("href"), label: a.getAttribute("aria-label"),
      w: Math.round(r.width), h: Math.round(r.height), natural: img.naturalWidth > 0,
      inside: r.top >= box.top - 1 && r.bottom <= box.bottom + 1 && r.left >= box.left - 1,
      boxH: Math.round(box.height),
    };
  });
  step(`${label}: логото е видимо и води към /admin`, !!info && info.href === "/admin" && info.natural, info ? `${info.w}×${info.h} в кутия ${info.boxH}px, aria="${info.label}"` : "няма лого с линк /admin");
  step(`${label}: логото не е отрязано от кутията`, !!info && info.inside && info.h <= info.boxH);
}

// Таблица: последната клетка (действия) на първия ред е изцяло видима в скрол контейнера.
async function checkTableActions(page, route, label) {
  await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
  const r = await page.evaluate(() => {
    const table = document.querySelector('[data-slot="table"]');
    if (!table) return { none: true };
    const container = table.closest('[data-slot="table-container"]');
    const row = table.querySelector("tbody tr");
    if (!row) return { empty: true };
    const cell = row.lastElementChild;
    const btn = cell.querySelector("button, a");
    const c = container.getBoundingClientRect();
    const b = (btn ?? cell).getBoundingClientRect();
    const sticky = getComputedStyle(cell).position === "sticky";
    const hscroll = container.scrollWidth > container.clientWidth + 1;
    return { visible: b.right <= c.right + 1 && b.left >= c.left - 1, sticky, hscroll, docScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth };
  });
  if (r.none) { step(`${label}: таблица`, false, "няма таблица"); return; }
  if (r.empty) { step(`${label}: таблица (празна, пропусната)`, true); return; }
  step(`${label}: действията на първия ред са изцяло видими`, r.visible, `sticky=${r.sticky} вътрешен скрол=${r.hscroll}`);
  step(`${label}: без хоризонтален скрол на страницата`, !r.docScroll);
}

const browser = await chromium.launch();
try {
  // ---------- DESKTOP ----------
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await login(page);
  await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
  await checkLogo(page, "Desktop sidebar");
  await shot(page, "v-admin-desktop");

  const bell = page.locator('aside button[aria-label^="Известия"]');
  step("Desktop: камбанка в sidebar-а", (await bell.count()) === 1, await bell.first().getAttribute("aria-label") ?? "");
  await bell.first().click();
  const panel = page.getByRole("dialog").or(page.locator('[data-slot="popover-content"], [data-radix-popper-content-wrapper]')).first();
  await panel.waitFor({ timeout: 8000 });
  await page.waitForTimeout(1500); // refetch
  const panelText = (await panel.textContent()) ?? "";
  step("Desktop: панелът „Известия“ се отваря", /Известия/.test(panelText), panelText.slice(0, 90).replace(/\s+/g, " "));
  const links = panel.locator('a[href^="/admin/bookings"]');
  const n = await links.count();
  step("Desktop: панелът показва записвания или празно състояние", n > 0 || /Няма нови/.test(panelText), `${n} елемента`);
  await shot(page, "v-admin-bell-open");
  const seen = panel.getByRole("button", { name: "Прочетени" });
  const seenEnabled = await seen.isEnabled();
  if (seenEnabled) {
    await seen.click();
    await page.waitForTimeout(1200);
    const after = await bell.first().getAttribute("aria-label");
    step("Desktop: „Прочетени“ нулира брояча", after === "Известия", after ?? "");
  } else {
    step("Desktop: „Прочетени“ е изключен при 0 непрочетени", true);
  }
  await page.keyboard.press("Escape");

  // Логото води към таблото
  await page.goto(`${BASE}/admin/settings`, { waitUntil: "networkidle" });
  await page.locator('aside a[href="/admin"]').first().click();
  await page.waitForURL(/\/admin$/, { timeout: 10000 });
  step("Desktop: клик на логото води към /admin", true);

  for (const [route, label] of [
    ["/admin/bookings", "График"], ["/admin/faq", "ЧЗВ"], ["/admin/testimonials", "Отзиви"], ["/admin/team", "Екип"],
    ["/admin/resources", "Изпълнители"], ["/admin/positions", "Места под наем"],
  ]) await checkTableActions(page, route, `Desktop ${label}`);
  await page.goto(`${BASE}/admin/services`, { waitUntil: "networkidle" });
  const cat = await page.locator('a[href^="/admin/services/"]').first().getAttribute("href");
  if (cat) await checkTableActions(page, cat, "Desktop Услуги/категория");
  // Hover върху ред: лепкавата клетка трябва да остане непрозрачна (нищо не прозира под нея).
  await page.goto(`${BASE}/admin/bookings`, { waitUntil: "networkidle" });
  const firstRow = page.locator('[data-slot="table"] tbody tr').first();
  if (await firstRow.count()) {
    await firstRow.locator("td").nth(1).hover();
    const op = await firstRow.locator("td").last().evaluate((td) => { const c = getComputedStyle(td).backgroundColor; return { c, opaque: !/rgba\(.*,\s*0?\.\d+\)$/.test(c) && c !== "transparent" }; });
    step("Desktop График: лепкавата клетка е непрозрачна при hover", op.opaque, op.c);
  }
  await shot(page, "v-bookings-desktop");

  await page.goto(`${BASE}/admin/blog`, { waitUntil: "networkidle" });
  const bodyText = await page.locator("main").last().textContent();
  step("Desktop Журнал: статусите са на български", /публикувана/.test(bodyText ?? "") && !/\bpublished\b/.test(bodyText ?? ""));
  await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
  step("Desktop Табло: секцията „Pipeline на админа“ е махната", !/Pipeline на админа/.test((await page.locator("main").last().textContent()) ?? ""));
  await page.context().close();

  // ---------- MOBILE ----------
  const mp = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
  await login(mp);
  await mp.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
  await checkLogo(mp, "Mobile header");
  const mbell = mp.locator('header button[aria-label^="Известия"]');
  step("Mobile: камбанка в шапката", (await mbell.count()) === 1);
  await mbell.first().tap();
  const mpanel = mp.locator('[data-slot="popover-content"], [data-radix-popper-content-wrapper]').first();
  await mpanel.waitFor({ timeout: 8000 });
  const fits = await mpanel.evaluate((el) => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= window.innerWidth + 1; });
  step("Mobile: панелът се побира в екрана", fits);
  await shot(mp, "v-admin-mobile-bell");
  await mp.keyboard.press("Escape");
  for (const [route, label] of [["/admin/bookings", "График"], ["/admin/faq", "ЧЗВ"], ["/admin/testimonials", "Отзиви"], ["/admin/reviews", "Google ревюта"]]) {
    if (route === "/admin/reviews") {
      await mp.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
      const hs = await mp.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      step("Mobile Google ревюта: без хоризонтален скрол", !hs);
    } else await checkTableActions(mp, route, `Mobile ${label}`);
  }
  if (cat) await checkTableActions(mp, cat, "Mobile Услуги/категория");
  const mrow = mp.locator('[data-slot="table"] tbody tr').nth(4);
  if (await mrow.count()) { await mrow.locator("td").nth(1).tap(); await mp.waitForTimeout(300); }
  await shot(mp, "v-bookings-mobile");
  await mp.context().close();

  console.log(fails === 0 ? `\nPASS: admin-verify (${BASE})` : `\nFAIL: ${fails} стъпки (${BASE})`);
  process.exitCode = fails === 0 ? 0 : 1;
} catch (e) {
  console.error("⛔", e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
