import { describe, it, expect } from "vitest";
import { safeFrom } from "./utils";

describe("safeFrom", () => {
  it("приема относителни пътища", () => {
    expect(safeFrom("/admin/bookings?x=1", "/admin")).toBe("/admin/bookings?x=1");
  });
  it("отхвърля open redirect варианти", () => {
    for (const bad of ["//evil.com", "https://evil.com", "/\\evil.com", "evil.com", "", null, undefined]) {
      expect(safeFrom(bad, "/admin")).toBe("/admin");
    }
  });
});
