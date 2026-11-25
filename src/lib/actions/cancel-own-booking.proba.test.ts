/**
 * №17: клиентът сам отказва своя час. Срещу пробната база (не живата): PROBA_DB=1, PROBA_DB_NAME=<база> в
 * euphoria-proba-8a (127.0.0.1:54331). Пътят е истинският «Нов час» в приложението (createMyBooking, с подменен
 * вход) и отказът от линка (cancelOwnBooking). Писмата и известията се хващат, нищо не се праща.
 */
import { writeFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const RES = { id: "NJufHioHULb546CsDgdEo", name: "Мария Иванова" };
const SVC = { id: "1_u45pBAYXS-2clE7lm5J", name: "Маникюр с гел лак" };
const PHONE = "0888 170 001";
const PHONE_CANON = "+359888170001";
const MAIL = "proba17-a@example.com";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/actions/auth-guard", () => ({
  requireStaff: vi.fn(async () => ({ session: { user: { id: "proba-staff" } }, resource: RES })),
}));
const sent = vi.hoisted(() => [] as Array<{ to: string; subject: string; html: string }>);
vi.mock("resend", () => ({
  Resend: class {
    emails = {
      send: async (opts: { to: string; subject: string; html: string }) => {
        sent.push(opts);
        return { data: { id: "proba" }, error: null };
      },
    };
  },
}));
const notes = vi.hoisted(() => [] as Array<{ to: string; title: string; body: string }>);
vi.mock("@/lib/notify", () => ({
  notifyResource: vi.fn(async (_id: string, p: { title: string; body: string }) => {
    notes.push({ to: "specialist", ...p });
    return { push: { sent: 0, failed: 0 }, telegram: true };
  }),
  notifyAdmin: vi.fn(async (p: { title: string; body: string }) => {
    notes.push({ to: "admin", ...p });
    return true;
  }),
}));

type Mods = {
  db: typeof import("@/lib/db");
  staff: typeof import("@/lib/actions/staff-bookings");
  cancel: typeof import("@/lib/actions/cancel-booking");
  time: typeof import("@/lib/booking/time");
};
let m: Mods;
const created: string[] = [];

describe.skipIf(!process.env.PROBA_DB)("№17: отказ на час от клиента в пробната база", () => {
  beforeAll(async () => {
    (await import("dotenv")).config({ path: ".env.local" });
    for (const k of ["DATABASE_URL", "DATABASE_URL_SESSION"] as const) {
      const u = new URL(process.env[k] ?? "");
      if (process.env.PROBA_DB_NAME) u.pathname = `/${process.env.PROBA_DB_NAME}`;
      process.env[k] = u.toString();
    }
    if (!/@(127\.0\.0\.1|localhost):54331\//.test(process.env.DATABASE_URL ?? "")) throw new Error("само пробната база");
    vi.stubEnv("RESEND_API_KEY", "re_proba");
    m = {
      db: await import("@/lib/db"),
      staff: await import("@/lib/actions/staff-bookings"),
      cancel: await import("@/lib/actions/cancel-booking"),
      time: await import("@/lib/booking/time"),
    };
    const { sql } = await import("drizzle-orm");
    await m.db.db.execute(sql`delete from bookings where client_id in (select id from clients where phone = ${PHONE_CANON})`);
    await m.db.db.execute(sql`delete from clients where phone = ${PHONE_CANON}`);
  });

  afterAll(async () => {
    if (!m) return;
    const { sql, inArray } = await import("drizzle-orm");
    if (created.length) await m.db.db.delete(m.db.schema.bookings).where(inArray(m.db.schema.bookings.id, created));
    await m.db.db.execute(sql`delete from clients where phone = ${PHONE_CANON}`);
  });

  beforeEach(() => {
    sent.length = 0;
    notes.length = 0;
  });

  const at = (day: string, time: string) => m.time.sofiaWallToUtc(day, time).toISOString();
  const row = (id: string) => m.db.db.query.bookings.findFirst({ where: (b, { eq }) => eq(b.id, id) });
  const client = () => m.db.db.query.clients.findFirst({ where: (c, { eq }) => eq(c.phone, PHONE_CANON) });
  const book = async (startAt: string, clientEmail?: string | null) => {
    const res = await m.staff.createMyBooking({
      serviceItemId: SVC.id,
      serviceName: SVC.name,
      startAt,
      clientName: "Проба Сириус",
      clientPhone: PHONE,
      clientEmail,
    });
    if (!res.ok) throw new Error(res.error);
    created.push(res.id);
    return res;
  };

  let first = "";

  it("запис от /staff с имейл: писмо с бутона «Откажи часа», имейлът е в клиентския запис", async () => {
    const res = await book(at("2026-12-02", "10:00"), MAIL);
    first = res.id;
    expect(res.emailSent).toBe(true);
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe(MAIL);
    expect(sent[0].html).toContain(`/otkazhi-chas/${res.id}"`);
    expect(sent[0].html).toContain(">Откажи часа</a>");
    expect((await client())?.email).toBe(MAIL);
    if (process.env.EMAIL_PREVIEW_DIR) writeFileSync(`${process.env.EMAIL_PREVIEW_DIR}/staff-potvarzhdenie.html`, sent[0].html);
  });

  it("запис от /staff без имейл: писмо няма, записаният имейл остава", async () => {
    const res = await book(at("2026-12-02", "12:00"), null);
    expect(res.emailSent).toBeNull();
    expect(sent).toHaveLength(0);
    expect((await client())?.email).toBe(MAIL);
  });

  it("отказ в срок: статус «отказан», бележка без «късен», известие «Отказан онлайн»", async () => {
    const res = await m.cancel.cancelOwnBooking(first);
    expect(res).toEqual({ ok: true, late: false });
    const b = await row(first);
    expect(b?.status).toBe("cancelled");
    expect(b?.cancelReason).toBe("отказан от клиента онлайн");
    expect(notes.map((n) => [n.to, n.title])).toEqual([
      ["specialist", "Отказан онлайн"],
      ["admin", "Отказан онлайн"],
    ]);
    expect(notes[0].body).toContain("Мястото е свободно.");
  });

  it("второ натискане: успех без второ известие", async () => {
    expect(await m.cancel.cancelOwnBooking(first)).toEqual({ ok: true, late: false });
    expect(notes).toHaveLength(0);
  });

  it("отказ под 5 часа: приема се и се отбелязва като късен", async () => {
    // Първото свободно място между 2 и 4,5 часа напред (в пробата може да има други часове днес).
    let res: Awaited<ReturnType<typeof book>> | null = null;
    for (let min = 120; min <= 270 && !res; min += 10) {
      res = await book(new Date(Date.now() + min * 60000).toISOString(), null).catch(() => null);
    }
    if (!res) throw new Error("няма свободно място до 4,5 часа напред");
    const out = await m.cancel.cancelOwnBooking(res.id);
    expect(out).toEqual({ ok: true, late: true });
    const b = await row(res.id);
    expect(b?.status).toBe("cancelled");
    expect(b?.cancelReason).toBe("късен отказ от клиента (под 5 часа)");
    expect(notes.map((n) => n.title)).toEqual(["Късен отказ, под 5 часа", "Късен отказ, под 5 часа"]);
    expect(notes[0].body).toContain("Може да се начисли 50% при следващо посещение.");
  });

  it("статусът пази: приключен бъдещ час не става «отказан»", async () => {
    const res = await book(at("2026-12-03", "10:00"), null);
    const { eq } = await import("drizzle-orm");
    await m.db.db.update(m.db.schema.bookings).set({ status: "completed" }).where(eq(m.db.schema.bookings.id, res.id));
    const out = await m.cancel.cancelOwnBooking(res.id);
    expect(out.ok).toBe(false);
    expect((await row(res.id))?.status).toBe("completed");
    expect(notes).toHaveLength(0);
  });

  it("непознат номер: не е намерен", async () => {
    expect(await m.cancel.cancelOwnBooking("izmislen-id-proba-17")).toEqual({ ok: false, error: "Часът не е намерен." });
  });
});
