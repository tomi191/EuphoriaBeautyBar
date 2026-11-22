import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Сметката на часовете (getDaySlots) не се пипа: тук само се подменя, за да се види
// кой ден връща новата функция при затворен, пълен и свободен ден.
const getDaySlots = vi.fn();
vi.mock("@/lib/db", () => ({ db: {}, schema: {} }));
vi.mock("@/lib/booking/slots", () => ({ getDaySlots: (o: unknown) => getDaySlots(o), isStartBookable: vi.fn() }));
vi.mock("@/lib/booking/offering", () => ({ resolveOffering: vi.fn(), sumOfferingPrices: vi.fn() }));
vi.mock("@/lib/booking/readiness", () => ({ getReadiness: vi.fn(), isReady: vi.fn() }));
vi.mock("@/lib/email/booking", () => ({ sendBookingConfirmation: vi.fn(), sendSalonNotification: vi.fn(), formatWhen: vi.fn() }));
vi.mock("@/lib/notify", () => ({ notifyResource: vi.fn(), notifyAdmin: vi.fn() }));

import { fetchFirstFreeDay } from "./public-booking";

const day = (statuses: string[]) => ({
  open: "x",
  close: "y",
  slots: statuses.map((status, i) => ({ start: `s${i}`, status })),
});

describe("fetchFirstFreeDay", () => {
  beforeEach(() => {
    getDaySlots.mockReset();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it("skips a closed Sunday and Monday and a full Tuesday", async () => {
    vi.setSystemTime(new Date("2026-11-22T10:00:00Z")); // неделя в София
    getDaySlots.mockImplementation(async ({ dateStr }: { dateStr: string }) => {
      if (dateStr === "2026-11-22" || dateStr === "2026-11-23") return null; // затворено
      if (dateStr === "2026-11-24") return day(["busy", "busy", "past"]); // пълен ден
      return day(["busy", "free"]);
    });
    expect(await fetchFirstFreeDay("r1", 30, 0, true)).toBe("2026-11-25");
    // Същите параметри като графика във формата.
    expect(getDaySlots).toHaveBeenCalledWith(
      expect.objectContaining({ resourceId: "r1", durationMin: 30, bufferMin: 0, minNoticeMin: 60, allowParallel: true }),
    );
  });

  it("counts a parallel slot as free", async () => {
    vi.setSystemTime(new Date("2026-11-24T10:00:00Z"));
    getDaySlots.mockResolvedValue(day(["busy", "parallel"]));
    expect(await fetchFirstFreeDay("r1", 20, 0, true)).toBe("2026-11-24");
  });

  it("crosses the end of the month", async () => {
    vi.setSystemTime(new Date("2026-11-29T10:00:00Z"));
    getDaySlots.mockImplementation(async ({ dateStr }: { dateStr: string }) =>
      dateStr < "2026-12-01" ? day(["busy"]) : day(["free"]),
    );
    expect(await fetchFirstFreeDay("r1", 30, 0)).toBe("2026-12-01");
  });

  it("returns null after 60 days without a free slot", async () => {
    vi.setSystemTime(new Date("2026-11-22T10:00:00Z"));
    getDaySlots.mockResolvedValue(day(["busy"]));
    expect(await fetchFirstFreeDay("r1", 30, 0)).toBeNull();
    expect(getDaySlots).toHaveBeenCalledTimes(60);
  });

  it("does not ask the schedule without a specialist or duration", async () => {
    expect(await fetchFirstFreeDay("", 30, 0)).toBeNull();
    expect(await fetchFirstFreeDay("r1", 0, 0)).toBeNull();
    expect(getDaySlots).not.toHaveBeenCalled();
  });
});
