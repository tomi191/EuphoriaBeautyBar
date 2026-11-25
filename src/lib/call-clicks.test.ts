import { describe, expect, it } from "vitest";
import { callKind, callSpot, parseCallClick, sofiaDay } from "./call-clicks";
import { createRateLimiter } from "./call-clicks-limit";

describe("callKind", () => {
  it("номерът на салона: tel и viber", () => {
    expect(callKind("tel:+359898663315")).toBe("tel");
    expect(callKind("tel:+359 898 66 33 15")).toBe("tel");
    expect(callKind("tel:0898663315")).toBe("tel");
    expect(callKind("viber://chat?number=%2B359898663315")).toBe("viber");
  });
  it("друг номер: *-other", () => {
    expect(callKind("tel:+359888123456")).toBe("tel-other");
    expect(callKind("viber://chat?number=%2B359888123456")).toBe("viber-other");
  });
  it("не е обаждане: null (и споделяне във Viber)", () => {
    expect(callKind("/zapazi-chas")).toBeNull();
    expect(callKind("https://maps.app.goo.gl/x")).toBeNull();
    expect(callKind("viber://forward?text=abc")).toBeNull();
    expect(callKind("tel:")).toBeNull();
    expect(callKind("viber://chat?number=%E0%A4%A")).toBeNull();
  });
});

function fakeEl(matches: Record<string, string | null>) {
  return {
    closest: (sel: string) =>
      sel in matches ? { getAttribute: (n: string) => (n === "data-call-spot" ? matches[sel] : null) } : null,
  };
}

describe("callSpot", () => {
  it("data-call-spot бие ориентира", () => {
    expect(callSpot(fakeEl({ "[data-call-spot]": "call-bar", header: null }))).toBe("call-bar");
  });
  it("непозната стойност → ориентирът", () => {
    expect(callSpot(fakeEl({ "[data-call-spot]": "evil", footer: null }))).toBe("footer");
  });
  it("заглавна, долна част, прозорец, страница", () => {
    expect(callSpot(fakeEl({ header: null }))).toBe("header");
    expect(callSpot(fakeEl({ footer: null }))).toBe("footer");
    expect(callSpot(fakeEl({ '[role="dialog"]': null }))).toBe("dialog");
    expect(callSpot(fakeEl({}))).toBe("page");
  });
});

describe("parseCallClick", () => {
  it("приема чист запис и маха наклонената черта в края", () => {
    expect(parseCallClick({ page: "/uslugi/balayazh-varna/", kind: "tel", spot: "page" })).toEqual({
      page: "/uslugi/balayazh-varna",
      kind: "tel",
      spot: "page",
    });
    expect(parseCallClick({ page: "/", kind: "viber", spot: "call-bar" })?.page).toBe("/");
  });
  it("отказва странното", () => {
    expect(parseCallClick(null)).toBeNull();
    expect(parseCallClick({ page: "/x", kind: "sms", spot: "page" })).toBeNull();
    expect(parseCallClick({ page: "/x", kind: "tel", spot: "nowhere" })).toBeNull();
    expect(parseCallClick({ page: "x", kind: "tel", spot: "page" })).toBeNull();
    expect(parseCallClick({ page: "/a?b=1", kind: "tel", spot: "page" })).toBeNull();
    expect(parseCallClick({ page: "/" + "a".repeat(130), kind: "tel", spot: "page" })).toBeNull();
    expect(parseCallClick({ page: "/admin/bookings", kind: "tel", spot: "page" })).toBeNull();
    expect(parseCallClick({ page: "/staff", kind: "tel", spot: "page" })).toBeNull();
    expect(parseCallClick({ page: "/x", kind: "tel", spot: "page", ip: "1.2.3.4" })).toEqual({ page: "/x", kind: "tel", spot: "page" });
  });
});

describe("sofiaDay", () => {
  it("денят е по София, не по UTC", () => {
    expect(sofiaDay(new Date("2026-11-25T22:30:00Z"))).toBe("2026-11-26");
    expect(sofiaDay(new Date("2026-11-25T21:59:00Z"))).toBe("2026-11-25");
  });
});

describe("createRateLimiter", () => {
  it("таван от един адрес и общо, после нов прозорец", () => {
    const allow = createRateLimiter({ perKey: 2, total: 3, windowMs: 1000 });
    expect(allow("a", 0)).toBe(true);
    expect(allow("a", 1)).toBe(true);
    expect(allow("a", 2)).toBe(false);
    expect(allow("b", 3)).toBe(true);
    expect(allow("c", 4)).toBe(false); // общият таван
    expect(allow("a", 1000)).toBe(true); // нов прозорец
  });
});
