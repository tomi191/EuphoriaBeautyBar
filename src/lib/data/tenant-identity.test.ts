import { describe, expect, it } from "vitest";
import { firstName, publicIdentity } from "./tenant-identity";

const r = { name: "Мария Иванова", image: "/images/team/maria.jpg" };

describe("publicIdentity (визия №21: име и снимка само със съгласие)", () => {
  it("наемател без съгласие: без име и без снимка", () => {
    expect(publicIdentity(r, { tenant: true, consent: false })).toEqual({ name: null, image: null });
  });
  it("наемател със съгласие: първо име и снимка", () => {
    expect(publicIdentity(r, { tenant: true, consent: true })).toEqual({ name: "Мария", image: "/images/team/maria.jpg" });
  });
  it("наемател със съгласие без снимка: само първо име", () => {
    expect(publicIdentity({ ...r, image: null }, { tenant: true, consent: true })).toEqual({ name: "Мария", image: null });
  });
  it("Снежана (не е наемател): цялото име и снимката, без значение от съгласието", () => {
    expect(publicIdentity(r, { tenant: false, consent: false })).toEqual(r);
  });
  it("първо име при излишни интервали", () => {
    expect(firstName("  Елена   Петрова ")).toBe("Елена");
  });
});
