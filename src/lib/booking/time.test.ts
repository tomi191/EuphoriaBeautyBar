import { describe, expect, it } from "vitest";
import { sofiaFirstDayFrom, sofiaWallToUtc } from "@/lib/booking/time";

describe("sofiaFirstDayFrom", () => {
  it("момент през деня → следващият ден (00:00 на същия ден е по-рано)", () => {
    // 12.12 14:16 в Sofia: намалението още не е позволено в 00:00 на 12.12.
    expect(sofiaFirstDayFrom(new Date("2026-12-12T12:16:35Z"))).toBe("2026-12-13");
  });
  it("точно 00:00 в Sofia → същият ден", () => {
    expect(sofiaFirstDayFrom(sofiaWallToUtc("2026-12-12", "00:00"))).toBe("2026-12-12");
  });
  it("след полунощ UTC, но преди полунощ в Sofia, и през смяната на часа", () => {
    expect(sofiaFirstDayFrom(new Date("2026-12-11T22:30:00Z"))).toBe("2026-12-13"); // 12.12 00:30 в Sofia
    expect(sofiaFirstDayFrom(new Date("2027-03-28T01:30:00Z"))).toBe("2027-03-29"); // денят на лятното часово време
    expect(sofiaFirstDayFrom(new Date("2026-10-24T21:00:00Z"))).toBe("2026-10-25"); // 00:00 в деня на зимното
  });
  it("денят, който връща, никога не почва преди момента", () => {
    for (let h = 0; h < 72; h++) {
      const at = new Date(Date.UTC(2026, 9, 24, h, 7));
      expect(sofiaWallToUtc(sofiaFirstDayFrom(at), "00:00").getTime()).toBeGreaterThanOrEqual(at.getTime());
    }
  });
});
