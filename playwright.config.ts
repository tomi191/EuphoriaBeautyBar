import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright e2e конфигурация за Euphoria Hair & Beauty Bar.
 * Документация: https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./e2e",
  // Паралелизъм в рамките на файл
  fullyParallel: true,
  // Не позволявай `test.only` да влезе в CI
  forbidOnly: !!process.env.CI,
  // Повтори при провал само в CI
  retries: process.env.CI ? 2 : 0,
  // Един worker в CI, иначе авто
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    // Записвай trace при първи повторен опит за по-лесен дебъг
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Пуска dev сървъра автоматично преди тестовете
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
