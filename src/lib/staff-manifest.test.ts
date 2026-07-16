import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Регресионен guard: scope „/staff" изглежда „по-правилно", но чупи push в
// инсталираното PWA — Chrome връзва push абонамента към manifest scope, а SW
// се регистрира на „/"; при по-тесен scope pushManager.subscribe()/доставката
// умират тихо. Виж commit eac1b6f (fix) и 2ab64b7 (регресията, юли 2026).
describe("staff.webmanifest", () => {
  const manifest = JSON.parse(readFileSync(join(process.cwd(), "public", "staff.webmanifest"), "utf8"));

  it("scope е '/' — /staff чупи web push в standalone PWA", () => {
    expect(manifest.scope).toBe("/");
  });

  it("start_url остава /staff (инсталацията тръгва от staff приложението)", () => {
    expect(manifest.start_url).toBe("/staff");
  });
});
