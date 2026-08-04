/* eslint-disable no-console */
// Journey: админ качва снимка (категория+описание) → тя се появява на /galeriya и
// началната страница → редакция на описание/категория → изтриване (ред + storage файл).
// Пускане: $env:DOTENV_CONFIG_PATH=".env.local"; node scripts/journey-gallery-admin.mjs
// Срещу друга база: JOURNEY_BASE=https://... (внимание: пише/трие РЕАЛНИ данни в DB+Storage).
import "dotenv/config";
import { chromium } from "@playwright/test";
import postgres from "postgres";

const BASE = process.env.JOURNEY_BASE ?? "http://localhost:3000";
// JOURNEY_* override — когато реалната админ парола е сменена след seed-а,
// scripts/_journey-admin-user.ts създава/трие временен тестов админ.
const EMAIL = process.env.JOURNEY_EMAIL ?? process.env.ADMIN_EMAIL;
const PASSWORD = process.env.JOURNEY_PASSWORD ?? process.env.ADMIN_PASSWORD;
const DB_URL = process.env.DATABASE_URL_SESSION ?? process.env.DATABASE_URL;
if (!EMAIL || !PASSWORD || !DB_URL) {
  console.error("⛔ Липсват ADMIN_EMAIL / ADMIN_PASSWORD / DATABASE_URL (DOTENV_CONFIG_PATH=.env.local?)");
  process.exit(1);
}

const sql = postgres(DB_URL, { ssl: "require", max: 1, connect_timeout: 15 });
const marker = `JOURNEY-GALLERY-${Date.now()}`;
const results = [];
const step = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✅" : "⛔"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) throw new Error(`FAIL: ${name}`);
};

/** Изчаква условие върху DB (server action-ите са async спрямо UI toast-а). */
async function waitFor(fn, { tries = 20, delay = 500 } = {}) {
  for (let i = 0; i < tries; i++) {
    const v = await fn();
    if (v) return v;
    await new Promise((r) => setTimeout(r, delay));
  }
  return null;
}

const browser = await chromium.launch();
const page = await browser.newPage();
let uploadedId = null;
let uploadedSrc = null;

try {
  // 1. Login
  await page.goto(`${BASE}/admin/login`);
  await page.fill("#email", EMAIL);
  await page.fill("#password", PASSWORD);
  await page.click("button[type=submit]");
  await page.waitForURL(/\/admin(?!\/login)/, { timeout: 15000 });
  step("Login като админ", true, page.url());

  // 2. Upload със категория + описание
  await page.goto(`${BASE}/admin/gallery`);
  await page.selectOption("#gallery-category", "manikyur");
  await page.fill("#gallery-description", marker);
  await page.setInputFiles('input[type="file"]', "public/images/gallery/g-1.webp");
  await page.waitForSelector('img[src^="blob:"]', { timeout: 10000 }); // preview = клиентският resize мина
  await page.click('button:has-text("Качи")');

  const row = await waitFor(async () => {
    const r = await sql`SELECT * FROM gallery_images WHERE description = ${marker}`;
    return r[0] ?? null;
  });
  step("Ред в БД след качване", !!row, row ? `id=${row.id}, category=${row.category}, alt=${row.alt}` : "няма ред");
  uploadedId = row.id;
  uploadedSrc = row.src;
  step("Категорията е записана", row.category === "manikyur", row.category);
  step("alt = описанието", row.alt === marker, row.alt);
  step(
    "Най-отпред в подредбата (sortOrder = min)",
    Number((await sql`SELECT min(sort_order) AS m FROM gallery_images`)[0].m) === row.sort_order,
    `sortOrder=${row.sort_order}`,
  );

  // 3. Файлът реално съществува в Storage
  const storageRes = await fetch(uploadedSrc);
  step(
    "Storage файлът се сервира",
    storageRes.ok && (storageRes.headers.get("content-type") ?? "").startsWith("image/"),
    `${storageRes.status} ${storageRes.headers.get("content-type")}`,
  );

  // 4. Появява се на публичните страници (revalidatePath ефектът)
  const galHtml = await (await fetch(`${BASE}/galeriya`)).text();
  step("/galeriya съдържа новата снимка", galHtml.includes(uploadedSrc), uploadedSrc.slice(-40));
  const homeHtml = await (await fetch(`${BASE}/`)).text();
  step("Началната страница я показва (първите 6)", homeHtml.includes(uploadedSrc));

  // 5. Редакция: описание + категория от картата. Новата снимка е с sortOrder=min →
  // първата карта в grid-а. (CSS [value=...] не работи с React controlled inputs —
  // стойността е DOM property, не атрибут.)
  await page.goto(`${BASE}/admin/gallery`);
  const card = page.locator("div.grid > div").first();
  const descInput = card.locator('input[aria-label="Описание"]');
  await descInput.waitFor({ timeout: 10000 });
  step("Картата на новата снимка показва описанието", (await descInput.inputValue()) === marker);
  await descInput.fill(`${marker}-EDITED`);
  await descInput.press("Enter");
  const edited = await waitFor(async () => {
    const r = await sql`SELECT description, alt FROM gallery_images WHERE id = ${uploadedId}`;
    return r[0]?.description === `${marker}-EDITED` ? r[0] : null;
  });
  step("Редакция на описанието стига до БД", !!edited, edited?.description);
  step("alt следва редактираното описание", edited?.alt === `${marker}-EDITED`, edited?.alt);

  await card.locator('select[aria-label="Категория"]').selectOption("svatbeni");
  const recat = await waitFor(async () => {
    const r = await sql`SELECT category FROM gallery_images WHERE id = ${uploadedId}`;
    return r[0]?.category === "svatbeni" ? r[0] : null;
  });
  step("Смяна на категорията стига до БД", !!recat, recat?.category);

  // 6. Изтриване (двустъпково потвърждение) → ред + storage файл изчезват
  const delBtn = card.locator('button[aria-label="Изтрий снимката"]');
  await delBtn.click();
  await card.locator('button[aria-label="Потвърди изтриването"]').click();
  const gone = await waitFor(async () => {
    const r = await sql`SELECT id FROM gallery_images WHERE id = ${uploadedId}`;
    return r.length === 0;
  });
  step("Редът е изтрит от БД", !!gone);
  // Източник на истината за Storage е storage.objects, НЕ публичният URL —
  // CDN-ът пред /object/public/ сервира кеширан отговор известно време след delete.
  const storagePath = uploadedSrc.split("/object/public/gallery/")[1];
  const objGone = await waitFor(async () => {
    const r = await sql`SELECT id FROM storage.objects WHERE bucket_id = 'gallery' AND name = ${storagePath}`;
    return r.length === 0;
  });
  step("Storage файлът е изтрит (storage.objects)", !!objGone, storagePath);
  const urlGone = await waitFor(
    async () => !(await fetch(`${uploadedSrc}?cb=${Date.now()}`)).ok,
    { tries: 10, delay: 1000 },
  );
  if (!urlGone) console.log("ℹ️ Публичният URL още сервира кеширано копие (CDN TTL) — обектът е изтрит от bucket-а.");
  const galAfter = await (await fetch(`${BASE}/galeriya`)).text();
  step("/galeriya вече не я съдържа", !galAfter.includes(uploadedSrc));

  console.log(`\n🏁 PASS — ${results.length}/${results.length} стъпки минаха (${BASE})`);
} catch (e) {
  console.error(`\n🏁 FAIL — ${results.filter((r) => r.ok).length}/${results.length} минаха; спряно на: ${e.message}`);
  // Cleanup при провал по средата — да не остане тестов ред/файл в реалната галерия.
  if (uploadedId) {
    await sql`DELETE FROM gallery_images WHERE id = ${uploadedId}`.catch(() => {});
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const prefix = `${supabaseUrl}/storage/v1/object/public/gallery/`;
    if (supabaseUrl && serviceKey && uploadedSrc?.startsWith(prefix)) {
      await fetch(`${supabaseUrl}/storage/v1/object/gallery/${uploadedSrc.slice(prefix.length)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${serviceKey}` },
      }).catch(() => {});
    }
    console.error(`(cleanup: изтрит тестов ред ${uploadedId} + storage файлът му)`);
  }
  process.exitCode = 1;
} finally {
  await browser.close();
  await sql.end();
}
