/**
 * №11, част 3: цената по промоцията срещу пробната база (не живата). Пуска се с PROBA_DB=1 и DATABASE_URL към
 * 127.0.0.1 (копието probak3 в euphoria-proba-8a). Пътят е истинският «Нов час» в приложението (createMyBooking,
 * с подменен вход) и преместването (rescheduleMyBooking); броенето на местата е заключено (lockPromoSlots).
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/actions/auth-guard", () => ({
  requireStaff: vi.fn(async () => ({ session: { user: { id: "proba-staff" } }, resource: { id: "p11k-snezhana" } })),
}));

const RES = "p11k-snezhana";
const SVC = "eZl7WKV0DNyNWhAFWC1xA"; // при Снежана, 28.5 €
const T1 = "p11m-t1";
const created: string[] = [];

type Mods = {
  db: typeof import("@/lib/db");
  offering: typeof import("@/lib/booking/offering");
  staff: typeof import("@/lib/actions/staff-bookings");
  time: typeof import("@/lib/booking/time");
};
let m: Mods;

describe.skipIf(!process.env.PROBA_DB)("цената по промоцията в пробната база", () => {
  beforeAll(async () => {
    (await import("dotenv")).config({ path: ".env.local" });
    if (!/@(127\.0\.0\.1|localhost):54331\//.test(process.env.DATABASE_URL ?? "")) throw new Error("само пробната база");
    m = {
      db: await import("@/lib/db"),
      offering: await import("@/lib/booking/offering"),
      staff: await import("@/lib/actions/staff-bookings"),
      time: await import("@/lib/booking/time"),
    };
    const { db } = m.db;
    const { sql } = await import("drizzle-orm");
    await db.execute(sql`delete from campaign_services where campaign_id like 'p11m-%'`);
    await db.execute(sql`delete from campaigns where id like 'p11m-%'`);
    await db.execute(sql`insert into campaigns (id, resource_id, kind, starts_on, ends_on, slots, status, approved_by, approved_at)
      values (${T1}, ${RES}, 'discount', '2026-11-24', '2026-12-05', 1, 'approved', 'proba', now())`);
    await db.execute(sql`insert into campaign_services (id, campaign_id, service_item_id, prev_price_eur, new_price_eur, regular_price_eur)
      values ('p11m-t1s', ${T1}, ${SVC}, 28.5, 22, 28.5)`);
  });

  afterAll(async () => {
    if (!m) return;
    const { db } = m.db;
    const { sql, inArray } = await import("drizzle-orm");
    if (created.length) await db.delete(m.db.schema.bookings).where(inArray(m.db.schema.bookings.id, created));
    await db.execute(sql`delete from campaign_services where campaign_id like 'p11m-%'`);
    await db.execute(sql`delete from campaigns where id like 'p11m-%'`);
  });

  const at = (day: string, time: string) => m.time.sofiaWallToUtc(day, time).toISOString();
  const row = async (id: string) =>
    m.db.db.query.bookings.findFirst({ where: (b, { eq }) => eq(b.id, id) });
  const price = (day: string, now?: string) =>
    m.offering.resolveBookingPrice({
      resourceId: RES,
      serviceItemIds: [SVC],
      startAt: m.time.sofiaWallToUtc(day, "06:00"),
      now: now ? m.time.sofiaWallToUtc(now, "12:00") : undefined,
    });

  it("в периода, извън периода и записан преди началото", async () => {
    expect((await price("2026-12-03")).outcome).toMatchObject({ state: "applied", campaignId: T1 });
    expect((await price("2026-12-03")).totalEur).toBe(22);
    expect((await price("2026-12-09")).outcome).toMatchObject({ state: "refused", reason: "out_of_range" });
    expect((await price("2026-12-03", "2026-11-23")).outcome).toEqual({ state: "none" });
    expect((await price("2026-12-03", "2026-11-23")).totalEur).toBe(28.5);
  });

  let promoBooking = "";
  let regularPhone = "";
  let promoPhone = "";
  it("последното място от двама едновременно: само един взима цената («Нов час» в приложението)", async () => {
    const mk = (time: string, phone: string) =>
      m.staff.createMyBooking({ serviceItemId: SVC, serviceName: "Проба 11-3", startAt: at("2026-12-03", time), clientName: "Проба", clientPhone: phone });
    const res = await Promise.all([mk("05:00", "+359 88 300 0001"), mk("07:30", "+359 88 300 0002")]);
    for (const r of res) expect(r.ok).toBe(true);
    const ids = res.map((r) => (r.ok ? r.id : ""));
    created.push(...ids);
    const rows = await Promise.all(ids.map(row));
    const promo = rows.filter((r) => r?.campaignId === T1);
    const regular = rows.filter((r) => r?.campaignId == null);
    expect(promo).toHaveLength(1);
    expect(regular).toHaveLength(1);
    expect(promo[0]).toMatchObject({ priceEur: 22, regularPriceEur: 28.5, source: "phone" });
    expect(regular[0]).toMatchObject({ priceEur: 28.5, regularPriceEur: null });
    promoBooking = promo[0]!.id;
    const phones = ["+359 88 300 0001", "+359 88 300 0002"];
    regularPhone = phones[rows.findIndex((r) => r?.campaignId == null)];
    promoPhone = phones[rows.findIndex((r) => r?.campaignId === T1)];
    expect((await price("2026-12-04")).outcome).toMatchObject({ state: "refused", reason: "slots" });
  });

  it("преместен час пази цената и промоцията, дори в ден извън периода", async () => {
    const r = await m.staff.rescheduleMyBooking(promoBooking, at("2026-12-10", "05:00"));
    expect(r.ok).toBe(true);
    expect(await row(promoBooking)).toMatchObject({ priceEur: 22, campaignId: T1, regularPriceEur: 28.5 });
  });

  it("неявил се не връща мястото, отказан го връща", async () => {
    const { eq } = await import("drizzle-orm");
    const b = m.db.schema.bookings;
    await m.db.db.update(b).set({ status: "no_show" }).where(eq(b.id, promoBooking));
    expect((await price("2026-12-04")).outcome).toMatchObject({ state: "refused", reason: "slots" });
    await m.db.db.update(b).set({ status: "cancelled" }).where(eq(b.id, promoBooking));
    expect((await price("2026-12-04")).outcome).toMatchObject({ state: "applied", campaignId: T1 });
  });

  it("само първо посещение: проверка по телефона или имейла, без отказаните", async () => {
    // regularPhone има неотказан час на 03.12 (горе); promoPhone има само отказан.
    const q = (client: { phone?: string; email?: string }) =>
      m.offering.resolveBookingPrice({ resourceId: RES, serviceItemIds: ["p11l-kusa"], startAt: m.time.sofiaWallToUtc("2026-12-05", "06:00"), client });
    const known = await q({ phone: "0" + regularPhone.replace(/[^0-9]/g, "").slice(-9) }); // същият номер, записан по друг начин
    expect(known.outcome).toMatchObject({ state: "refused", reason: "not_first", campaignId: "p11l-c1" });
    expect(known.totalEur).toBe(25);
    const onlyCancelled = await q({ phone: promoPhone.replace(/ /g, "") });
    expect(onlyCancelled.outcome.state === "applied" || (onlyCancelled.outcome.state === "refused" && onlyCancelled.outcome.reason === "slots")).toBe(true);
    const fresh = await q({ phone: "+359 88 300 0999", email: "nova-11-3@example.com" });
    expect(fresh.outcome.state === "applied" || (fresh.outcome.state === "refused" && fresh.outcome.reason === "slots")).toBe(true);
    if (fresh.outcome.state === "applied") expect(fresh.totalEur).toBe(20);
  });

  it("заключването: двама едновременно с бавен запис; без него и двамата взимат последното място", async () => {
    const { sql, inArray } = await import("drizzle-orm");
    const { db, schema } = m.db;
    const NAILS = "p11k-nails";
    const S1 = "p11k-s1";
    await db.execute(sql`insert into campaigns (id, resource_id, kind, starts_on, ends_on, slots, status, approved_by, approved_at)
      values ('p11m-t2', ${NAILS}, 'discount', '2026-11-24', '2026-12-05', 1, 'approved', 'proba', now())`);
    await db.execute(sql`insert into campaign_services (id, campaign_id, service_item_id, prev_price_eur, new_price_eur, regular_price_eur)
      values ('p11m-t2s', 'p11m-t2', ${S1}, 20, 16, 20)`);
    let n = 0;
    const run = (time: string, lock: boolean) =>
      db.transaction(async (tx) => {
        if (lock) await m.offering.lockPromoSlots(tx, NAILS, [S1]);
        const p = await m.offering.resolveBookingPrice({ resourceId: NAILS, serviceItemIds: [S1], startAt: m.time.sofiaWallToUtc("2026-12-04", time) }, tx);
        await new Promise((r) => setTimeout(r, 300)); // бавен запис: другият вече е преброил
        const id = `p11m-b${++n}`;
        const startAt = m.time.sofiaWallToUtc("2026-12-04", time);
        await tx.insert(schema.bookings).values({
          id,
          resourceId: NAILS,
          serviceItemId: S1,
          serviceName: "Проба 11-3",
          startAt,
          endAt: new Date(startAt.getTime() + 30 * 60000),
          status: "confirmed",
          source: "phone",
          priceEur: p.totalEur,
          campaignId: p.campaignId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        created.push(id);
        return { id, campaignId: p.campaignId };
      });
    const without = await Promise.all([run("05:00", false), run("06:30", false)]);
    expect(without.filter((r) => r.campaignId).length).toBe(2); // контрола: пробата може да падне
    await db.delete(schema.bookings).where(inArray(schema.bookings.id, without.map((r) => r.id)));
    const locked = await Promise.all([run("05:00", true), run("06:30", true)]);
    expect(locked.filter((r) => r.campaignId).length).toBe(1);
  });
});
