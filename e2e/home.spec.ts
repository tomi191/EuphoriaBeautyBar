import { test, expect } from "@playwright/test";

/**
 * Примерен smoke тест за началната страница.
 * Пуска се с `npm run test:e2e` (виж package.json).
 */
test("началната страница се зарежда", async ({ page }) => {
  await page.goto("/");

  // Страницата има <title> (не е празна/счупена)
  await expect(page).toHaveTitle(/Euphoria/i);

  // Има поне един <h1> заглавие
  await expect(page.locator("h1").first()).toBeVisible();
});
