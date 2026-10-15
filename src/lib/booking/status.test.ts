import { describe, it, expect } from "vitest";
import { canTransition } from "./status";

describe("canTransition", () => {
  it("confirmed → arrived/completed/cancelled/no_show", () => {
    expect(canTransition("confirmed", "arrived")).toBe(true);
    expect(canTransition("confirmed", "cancelled")).toBe(true);
    expect(canTransition("confirmed", "no_show")).toBe(true);
    expect(canTransition("confirmed", "completed")).toBe(true);
  });
  it("arrived → completed/cancelled", () => {
    expect(canTransition("arrived", "completed")).toBe(true);
    expect(canTransition("arrived", "cancelled")).toBe(true);
    expect(canTransition("arrived", "no_show")).toBe(false);
  });
  it("completed/cancelled/no_show са терминални", () => {
    for (const from of ["completed", "cancelled", "no_show"]) {
      for (const to of ["arrived", "completed", "cancelled", "no_show"] as const) {
        expect(canTransition(from, to)).toBe(false);
      }
    }
  });
});
