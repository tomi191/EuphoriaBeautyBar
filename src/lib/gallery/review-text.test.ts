import { describe, expect, it } from "vitest";
import { REJECT_REASONS, approvedCount, parseGalleryCallback, pendingCount, reviewDay, uploadedWhen, uploadedWhenTg } from "@/lib/gallery/review-text";
import { REJECT_REASON_MAX } from "@/lib/gallery/upload-rules";

describe("одобрението при Снежана: текстове и бутони", () => {
  it("данните на бутоните в Telegram", () => {
    expect(parseGalleryCallback("gal:ok:gs-AbC_12-x")).toEqual({ action: "ok", id: "gs-AbC_12-x" });
    expect(parseGalleryCallback("gal:rj:gs-1")).toEqual({ action: "rj", id: "gs-1" });
    expect(parseGalleryCallback("gal:bk:gs-1")).toEqual({ action: "bk", id: "gs-1" });
    expect(parseGalleryCallback("gal:rr:gs-1:3")).toEqual({ action: "rr", id: "gs-1", reason: 3 });
    for (const bad of ["gal:rr:gs-1:4", "gal:rr:gs-1", "gal:ok:gs-1:1", "day:2026-11-24", "gal:xx:gs-1", "gal:ok:", "gal:ok:a b", undefined]) {
      expect(parseGalleryCallback(bad)).toBeNull();
    }
    // Най-дългите данни се побират в 64 байта на Telegram.
    expect(Buffer.byteLength(`gal:rr:${"x".repeat(40)}:3`)).toBeLessThanOrEqual(64);
  });

  it("готовите причини се побират в 80 знака", () => {
    for (const r of REJECT_REASONS) expect([...r.text].length).toBeLessThanOrEqual(REJECT_REASON_MAX);
  });

  it("днес, вчера и по-стара дата по часа в София", () => {
    const now = new Date("2026-11-24T10:00:00Z"); // 12:00 в София
    expect(uploadedWhen(new Date("2026-11-24T13:40:00Z"), now)).toBe("днес, 15:40");
    expect(uploadedWhen(new Date("2026-11-23T16:25:00Z"), now)).toBe("вчера, 18:25");
    expect(uploadedWhen(new Date("2026-11-19T16:25:00Z"), now)).toBe("19 ноември, 18:25");
    expect(uploadedWhenTg(new Date("2026-11-24T13:40:00Z"), now)).toBe("днес в 15:40");
    // 23:30 по UTC на 23-ти е 01:30 на 24-ти в София: «днес».
    expect(uploadedWhen(new Date("2026-11-23T23:30:00Z"), now)).toBe("днес, 01:30");
    expect(reviewDay(new Date("2026-11-21T10:00:00Z"))).toBe("21 ноември");
  });

  it("броячите", () => {
    expect(pendingCount(1)).toBe("1 чака");
    expect(pendingCount(3)).toBe("3 чакат");
    expect(approvedCount(1)).toBe("1 снимка от специалистите");
    expect(approvedCount(4)).toBe("4 снимки от специалистите");
  });
});
