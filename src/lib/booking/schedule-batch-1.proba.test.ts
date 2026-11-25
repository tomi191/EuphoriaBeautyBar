/**
 * Решение 4, първа партида, срещу пробната база (не живата): PROBA_DB=1 и DATABASE_URL към 127.0.0.1:54331
 * (proba4 в euphoria-proba-8a). Истинските createPublicBooking, fetchPublicSlots и createMyBooking; писмата и
 * известията са подменени (нищо не излиза навън).
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/actions/auth-guard", () => ({
  requireStaff: vi.fn(async () => ({ session: { user: { id: "proba-staff" } }, resource: { id: "p11k-snezhana" } })),
}));
vi.mock("@/lib/notify", () => ({
  notifyResource: vi.fn(async () => ({ push: { sent: 0, failed: 0 }, telegram: false })),
  notifyAdmin: vi.fn(async () => false),
}));
vi.mock("@/lib/email/booking", async (orig) => ({
  ...(await orig<typeof import("@/lib/email/booking")>()),
  sendBookingConfirmation: vi.fn(async () => false),
  sendSalonNotification: vi.fn(async () => false),
}));

const RES = "p11k-snezhana";
const CUT = "p11l-kusa"; // 30 мин + 10 пауза
const BOTOX = "proba11-botoks"; // 60 мин + 15 пауза
const COLOR = "p11l-boyad"; // 120 мин + 10, нанасяне 30, престой 60 (в proba4)
const DAY = "2026-12-02";

type Mods = {
  db: typeof import("@/lib/db");
  pub: typeof import("@/lib/actions/public-booking");
  staff: typeof import("@/lib/actions/staff-bookings");
  time: typeof import("@/lib/booking/time");
  slots: typeof import("@/lib/booking/slots");
};
let m: Mods;
const created: string[] = [];

describe.skipIf(!process.env.PROBA_DB)("графикът, първа партида, в пробната база", () => {
  beforeAll(async () => {
    (await import("dotenv")).config({ path: ".env.local" });
    if (!/@(127\.0\.0\.1|localhost):54331\/proba4/.test(process.env.DATABASE_URL ?? "")) throw new Error("само пробната база");
    m = {
      db: await import("@/lib/db"),
      pub: await import("@/lib/actions/public-booking"),
      staff: await import("@/lib/actions/staff-bookings"),
      time: await import("@/lib/booking/time"),
      slots: await import("@/lib/booking/slots"),
    };
    const { sql } = await import("drizzle-orm");
    await m.db.db.execute(sql`delete from bookings where resource_id = ${RES} and start_at >= ${m.time.sofiaWallToUtc(DAY, "00:00").toISOString()}::timestamptz and start_at < ${m.time.sofiaWallToUtc("2026-12-03", "00:00").toISOString()}::timestamptz`);
    await m.db.db.execute(sql`delete from site_settings where key = ${m.slots.roundStartsKey(RES)}`);
  });

  afterAll(async () => {
    if (!m) return;
    const { inArray, sql } = await import("drizzle-orm");
    if (created.length) await m.db.db.delete(m.db.schema.bookings).where(inArray(m.db.schema.bookings.id, created));
    await m.db.db.execute(sql`delete from site_settings where key = ${m.slots.roundStartsKey(RES)}`);
  });

  const at = (time: string) => m.time.sofiaWallToUtc(DAY, time).toISOString();
  const row = (id: string) => m.db.db.query.bookings.findFirst({ where: (b, { eq }) => eq(b.id, id) });
  let n = 0;
  const book = async (ids: string[], time: string, allowParallel = false) => {
    n += 1;
    const quote = await m.pub.quotePublicBooking({ resourceId: RES, serviceItemIds: ids, startAt: at(time) });
    const res = await m.pub.createPublicBooking({
      resourceId: RES,
      serviceItemId: ids.length === 1 ? ids[0] : null,
      serviceItemIds: ids.length === 1 ? undefined : ids,
      serviceName: ids.join(" + "),
      durationMin: 1, // сървърът не вярва на тези числа
      bufferMin: 0,
      startAt: at(time),
      clientName: "Проба Графика",
      clientPhone: `+359 88 400 ${String(100 + n)}`,
      clientEmail: `p4-${n}-${Date.now()}@example.com`,
      consentLate: true,
      allowParallel,
      expectedTotalEur: quote?.totalEur ?? null,
    });
    if (res.ok) created.push(res.id);
    return { res, quote };
  };

  it("две услуги онлайн: една пауза (най-дългата), краят и сумата", async () => {
    const { res, quote } = await book([BOTOX, CUT], "09:00");
    expect(res.ok).toBe(true);
    const b = await row((res as { id: string }).id);
    // 60 + 30 работа и една пауза 15 (не 15 + 10) → блокът свършва в 10:45
    expect(b!.endAt.toISOString()).toBe(at("10:45"));
    expect(b!.priceEur).toBe(quote!.totalEur);
    expect(b!.activeMin).toBe(0);
    expect(b!.processingMin).toBe(0);
  });

  it("веднага след него онлайн се записва 10:45 (при стария сбор на паузите беше заето до 10:55)", async () => {
    const day = await m.pub.fetchPublicSlots(RES, DAY, 30, 10, true);
    const s = day.slots.find((x) => x.start === at("10:45"));
    expect(s?.status).toBe("free");
  });

  it("боядисване + подстригване пазят престоя и в него се записва друг клиент", async () => {
    const { res } = await book([COLOR, CUT], "13:00");
    expect(res.ok).toBe(true);
    const b = await row((res as { id: string }).id);
    expect(b!.endAt.toISOString()).toBe(at("15:40")); // 120 + 30 работа + 10 пауза
    expect([b!.activeMin, b!.processingMin]).toEqual([30, 60]); // престоят 13:30–14:30
    // Онлайн и в приложението подстригване (30 + 10) излиза «в престой» в 13:35.
    const pubDay = await m.pub.fetchPublicSlots(RES, DAY, 30, 10, true);
    expect(pubDay.slots.find((x) => x.start === at("13:35"))?.status).toBe("parallel");
    const staffDay = await m.staff.fetchMySlots(CUT, DAY);
    expect(staffDay.slots.find((x) => x.start === at("13:35"))?.status).toBe("parallel");
    expect(staffDay.slots.find((x) => x.start === at("13:15"))?.status).toBe("busy"); // нанасянето
    const other = await m.staff.createMyBooking({
      serviceItemId: CUT,
      serviceName: "Дамско подстригване (къса коса)",
      startAt: at("13:35"),
      clientName: "Проба Престой",
      clientPhone: "+359 88 400 998",
      allowParallel: true,
    });
    expect(other.ok).toBe(true);
    if (other.ok) created.push(other.id);
  });

  it(":00 и :30 изключено: онлайн излизат и :15 и :45; включено: само :00 и :30, и записът на :15 се отказва", async () => {
    const off = await m.pub.fetchPublicSlots(RES, DAY, 30, 10, true);
    expect(off.slots.some((s) => new Date(s.start).getUTCMinutes() === 15)).toBe(true);
    const { sql } = await import("drizzle-orm");
    await m.db.db.execute(sql`insert into site_settings (key, value, updated_at) values (${m.slots.roundStartsKey(RES)}, ${JSON.stringify({ on: true })}::jsonb, now())`);
    const on = await m.pub.fetchPublicSlots(RES, DAY, 30, 10, true);
    expect(on.slots.length).toBeGreaterThan(0);
    expect(on.slots.every((s) => new Date(s.start).getUTCMinutes() % 30 === 0)).toBe(true);
    expect(on.slots.map((s) => s.start)).toEqual(off.slots.filter((s) => new Date(s.start).getUTCMinutes() % 30 === 0).map((s) => s.start));
    const refused = await book([CUT], "16:15");
    expect(refused.res.ok).toBe(false);
    const ok = await book([CUT], "16:30");
    expect(ok.res.ok).toBe(true);
    // Приложението не е засегнато: там :15 остава.
    const staffDay = await m.staff.fetchMySlots(CUT, DAY);
    expect(staffDay.slots.some((s) => new Date(s.start).getUTCMinutes() === 15 && s.status === "free")).toBe(true);
    await m.db.db.execute(sql`delete from site_settings where key = ${m.slots.roundStartsKey(RES)}`);
  });

  it("«веднага след предишния» в приложението: краят на часа и записът там минава", async () => {
    const day = await m.staff.fetchMySlots(CUT, DAY);
    expect(day.afterPrev).toContain(at("10:45"));
    expect(day.afterPrev).toContain(at("15:40"));
    const res = await m.staff.createMyBooking({
      serviceItemId: CUT,
      serviceName: "Дамско подстригване (къса коса)",
      startAt: at("15:40"),
      clientName: "Проба Веднага",
      clientPhone: "+359 88 400 999",
    });
    expect(res.ok).toBe(true);
    if (res.ok) created.push(res.id);
    const b = await row((res as { id: string }).id);
    expect(b!.startAt.toISOString()).toBe(at("15:40"));
  });
});
