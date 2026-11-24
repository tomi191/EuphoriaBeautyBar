/**
 * №11, част 4: кронът на промоциите, постът при старта, каруселът и триенето срещу пробната база (не живата).
 * Пуска се с PROBA_DB=1 и DATABASE_URL към 127.0.0.1:54331 (probak3). Meta е подменена (fetchImpl), Telegram и
 * известията са подменени: нищо не излиза навън. Чуждите промоции в пробата се паркират за времето на теста и
 * се връщат в afterAll, за да се брои само нашето.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
const sent = vi.hoisted(() => ({
  resource: [] as { resourceId: string; body: string }[],
  admin: [] as { text: string; keyboard?: unknown }[],
  adminPhoto: [] as { url: string | null; caption: string; keyboard: unknown }[],
}));
vi.mock("@/lib/notify", () => ({
  notifyResource: vi.fn(async (resourceId: string, p: { body: string }) => {
    sent.resource.push({ resourceId, body: p.body });
    return { push: { sent: 0, failed: 0 }, telegram: true };
  }),
  notifyAdmin: vi.fn(async () => true),
}));
vi.mock("@/lib/telegram", async (orig) => ({
  ...(await orig<typeof import("@/lib/telegram")>()),
  sendTelegramToAdmin: vi.fn(async (text: string, keyboard?: unknown) => {
    sent.admin.push({ text, keyboard });
    return true;
  }),
  sendTelegramPhotoToAdmin: vi.fn(async (url: string | null, caption: string, keyboard: unknown) => {
    sent.adminPhoto.push({ url, caption, keyboard });
    return "photo" as const;
  }),
}));

const VIOLETA = "p11k-nails"; // наемател, без съгласие → «специалиста по маникюр»
const SNEZHANA = "p11k-snezhana"; // собственик
const PEDI = "p11k-s3"; // Педикюр с гел лак, онлайн
const MANI_OFFLINE = "p11k-s2"; // Маникюр с гел лак, без онлайн запис при Виолета
const KUSA = "p11l-kusa";
const BOYAD = "p11l-boyad";
const BOTOKS = "proba11-botoks";
const env = { FACEBOOK_PAGE_ID: "1234567890", FACEBOOK_PAGE_ACCESS_TOKEN: "fake-token" };

type Call = { url: string; body: Record<string, string> };
const calls: Call[] = [];
let mode: "ok" | "fail" = "ok";
let postN = 0;
const fetchImpl = (async (url: string, init: RequestInit) => {
  const body = Object.fromEntries(new URLSearchParams(init.body as URLSearchParams));
  calls.push({ url, body });
  const reply = (status: number, b: unknown) => new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json" } });
  if (mode === "fail") return reply(400, { error: { code: 100, message: "proba" } });
  if (body.method === "delete") return url.endsWith("_666") ? reply(400, { error: { code: 100 } }) : reply(200, { success: true });
  postN++;
  return reply(200, url.endsWith("/photos") ? { id: `9${postN}`, post_id: `1234567890_${postN}` } : { id: `1234567890_80${postN}` });
}) as unknown as typeof fetch;
const fb = { env, fetchImpl };

type Mods = {
  db: typeof import("@/lib/db");
  life: typeof import("@/lib/campaigns/lifecycle");
  face: typeof import("@/lib/campaigns/facebook");
  core: typeof import("@/lib/campaigns/core");
  rules: typeof import("@/lib/campaigns/rules");
  time: typeof import("@/lib/booking/time");
  pub: typeof import("@/lib/actions/public-booking");
};
let m: Mods;
let parked: { id: string; status: string }[] = [];
let today = "";
const d = (n: number) => m.rules.addDays(today, n);

describe.skipIf(!process.env.PROBA_DB)("промоциите: кронът, Facebook и триенето в пробната база", () => {
  beforeAll(async () => {
    (await import("dotenv")).config({ path: ".env.local" });
    if (!/@(127\.0\.0\.1|localhost):54331\//.test(process.env.DATABASE_URL ?? "")) throw new Error("само пробната база");
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.euphoriabeauty.eu";
    m = {
      db: await import("@/lib/db"),
      life: await import("@/lib/campaigns/lifecycle"),
      face: await import("@/lib/campaigns/facebook"),
      core: await import("@/lib/campaigns/core"),
      rules: await import("@/lib/campaigns/rules"),
      time: await import("@/lib/booking/time"),
      pub: await import("@/lib/actions/public-booking"),
    };
    today = m.core.todaySofia();
    const { db } = m.db;
    const { sql } = await import("drizzle-orm");
    await cleanup();
    // Паркираме чуждите отворени промоции (връщат се в afterAll).
    const rows = await db.execute(sql`select id, status from campaigns where id not like 'p11n-%' and status in ('pending','approved')`);
    parked = (Array.isArray(rows) ? rows : (rows as { rows: unknown[] }).rows) as { id: string; status: string }[];
    await db.execute(sql`update campaigns set status = 'stopped', stop_reason = 'proba_park' where id not like 'p11n-%' and status in ('pending','approved')`);

    const camp = async (id: string, res: string, kind: string, from: string, to: string, svc: string, o: { slots?: number; first?: boolean; prev?: number; next?: number; gift?: string } = {}) => {
      await db.execute(sql`insert into campaigns (id, resource_id, kind, gift, starts_on, ends_on, slots, first_visit_only, status, approved_by, approved_at)
        values (${id}, ${res}, ${kind}, ${o.gift ?? null}, ${from}, ${to}, ${o.slots ?? null}, ${o.first ?? false}, 'approved', 'proba', now())`);
      await db.execute(sql`insert into campaign_services (id, campaign_id, service_item_id, prev_price_eur, new_price_eur, regular_price_eur, price_from)
        values (${id + "-s"}, ${id}, ${svc}, ${o.prev ?? null}, ${o.next ?? null}, ${o.prev ?? 55}, ${kind === "gift"})`);
    };
    await camp("p11n-start", VIOLETA, "discount", d(0), d(10), PEDI, { prev: 30, next: 24, first: true, slots: 5 });
    await camp("p11n-up", SNEZHANA, "discount", d(3), d(12), BOTOKS, { prev: 35, next: 28 });
    await camp("p11n-ended", VIOLETA, "discount", d(-10), d(-1), PEDI, { prev: 30, next: 24 });
    await camp("p11n-two", SNEZHANA, "discount", d(-5), d(2), KUSA, { prev: 25, next: 20 });
    await camp("p11n-quiet", VIOLETA, "discount", d(-8), d(5), PEDI, { prev: 30, next: 25 });
    await camp("p11n-full", SNEZHANA, "gift", d(-2), d(10), BOYAD, { slots: 1, gift: "ампула Nashi Argan" });
    await camp("p11n-hidden", VIOLETA, "discount", d(0), d(5), MANI_OFFLINE, { prev: 25, next: 20 });
    // Клиентите и часовете (адресите са @example.com).
    for (const [id, phone] of [["p11n-cl1", "+359 88 311 9001"], ["p11n-cl2", "+359 88 311 9002"], ["p11n-cl3", "+359 88 311 9003"]]) {
      await db.execute(sql`insert into clients (id, name, phone, email, email_verified, created_at) values (${id}, 'Проба', ${phone}, ${id + "@example.com"}, true, now())`);
    }
    const at = (day: string, time: string) => m.time.sofiaWallToUtc(day, time);
    const book = async (id: string, res: string, client: string, day: string, time: string, status: string, campaign: string | null) => {
      const s = at(day, time);
      await db.execute(sql`insert into bookings (id, resource_id, service_name, client_id, start_at, end_at, status, source, campaign_id, created_at, updated_at)
        values (${id}, ${res}, 'Проба', ${client}, ${s.toISOString()}::timestamptz, ${new Date(s.getTime() + 20 * 60000).toISOString()}::timestamptz, ${status}, 'online', ${campaign}, now(), now())`);
    };
    await book("p11n-b0", VIOLETA, "p11n-cl2", d(-40), "06:00", "completed", null); // по-ранен час на cl2: не е нов
    await book("p11n-b1", VIOLETA, "p11n-cl1", d(-9), "06:00", "completed", "p11n-ended");
    await book("p11n-b2", VIOLETA, "p11n-cl2", d(-9), "06:30", "no_show", "p11n-ended");
    await book("p11n-b3", VIOLETA, "p11n-cl3", d(-9), "07:00", "cancelled", "p11n-ended");
    await book("p11n-b4", SNEZHANA, "p11n-cl1", d(4), "06:00", "confirmed", "p11n-full");
  });

  async function cleanup() {
    const { sql } = await import("drizzle-orm");
    const { db } = m.db;
    await db.execute(sql`delete from bookings where id like 'p11n-%'`);
    await db.execute(sql`delete from clients where id like 'p11n-%'`);
    await db.execute(sql`delete from campaign_carousels where 'p11n-start' = any(campaign_ids) or 'p11n-two' = any(campaign_ids)`);
    await db.execute(sql`delete from campaign_services where campaign_id like 'p11n-%'`);
    await db.execute(sql`delete from campaigns where id like 'p11n-%'`);
  }

  afterAll(async () => {
    if (!m) return;
    const { sql } = await import("drizzle-orm");
    await cleanup();
    for (const p of parked) {
      await m.db.db.execute(sql`update campaigns set status = ${p.status}, stop_reason = null where id = ${p.id} and stop_reason = 'proba_park'`);
    }
  });

  const row = (id: string) => m.db.db.query.campaigns.findFirst({ where: (c, { eq }) => eq(c.id, id) });
  const toRes = (res: string, re: RegExp) => sent.resource.filter((x) => x.resourceId === res && re.test(x.body));

  it("кронът по дати: постът в деня на началото, известията и спирането от системата", async () => {
    const s = await m.life.runCampaignCron(fb);
    expect(s.today).toBe(today);

    // Постът: тръгва днес → излиза с картината и текста на Саиф; предстоящата не.
    const photos = calls.filter((c) => c.url.endsWith("/1234567890/photos"));
    const startCall = photos.find((c) => c.body.url.includes("p11n-start"))!;
    expect(startCall.body.url).toBe("https://www.euphoriabeauty.eu/api/og/promo/p11n-start");
    expect(startCall.body.caption).toBe(
      `В Euphoria, кв. Левски, Варна: Педикюр с гел лак при специалиста по маникюр, нова цена 24 €, предишна цена 30 € (−20%). Само за първо посещение при този специалист. Общо 5 места. Важи до ${m.rules.longDay(d(10), today)} включително.\n\nЗапиши час: https://www.euphoriabeauty.eu/promotsii?id=p11n-start&from=facebook#promo-p11n-start`,
    );
    expect(photos.some((c) => c.body.url.includes("p11n-up"))).toBe(false);
    expect((await row("p11n-start"))?.facebookPostId).toMatch(/^1234567890_\d+$/);
    expect(toRes(VIOLETA, /^Промоцията „Педикюр с гел лак“ тръгна\. Постът във Facebook: https:\/\/www\.facebook\.com\/1234567890_\d+$/).length).toBeGreaterThan(0);

    // 6.9: свърши, с отчета до специалиста и до Снежана (с името).
    const report = `свърши. Записани часове: 2, дошли: 1, отказани: 1, неявили се: 1.\nНови клиенти: 1.`;
    expect(toRes(VIOLETA, /свърши\./).map((x) => x.body)).toContain(`Промоцията „Педикюр с гел лак“ ${report}`);
    expect(sent.admin.map((x) => x.text)).toContain(`Промоцията „Педикюр с гел лак“ на Виолета Проба ${report}`);

    // 6.8: 2 дни преди края (Снежана е собственикът: само до нея като специалист).
    expect(toRes(SNEZHANA, /свършва на/).map((x) => x.body)).toEqual([
      `Промоцията „Дамско подстригване (къса коса)“ свършва на ${m.rules.shortDay(d(2), today)}. Записани часове: 0. Краят не се мести.`,
    ]);
    // 6.6: местата свършиха.
    expect(toRes(SNEZHANA, /^Местата по/).map((x) => x.body)).toEqual([
      "Местата по „Боядисване (дълга коса)“ свършиха. Промоцията се скри от сайта. Записани часове: 1.",
    ]);
    // 7 дни без нито един час: до специалиста и до Снежана; промоцията от вчера (start) още не.
    expect(toRes(VIOLETA, /тече от 7 дни/)).toHaveLength(1);
    expect(sent.admin.filter((x) => /на Виолета Проба тече от 7 дни без нито един записан час/.test(x.text))).toHaveLength(1);
    expect(s.quiet).toBe(1);
    // Спиране от системата: услугата без онлайн запис.
    const hidden = await row("p11n-hidden");
    expect(hidden).toMatchObject({ status: "stopped", stopReason: "system_hidden", stoppedBy: "system" });
    expect(toRes(VIOLETA, /^Промоцията „Маникюр с гел лак“ е спряна: услугата вече не е в онлайн записването\./)).toHaveLength(1);
    expect(s.stopped).toBe(1);

    // Второто пускане (21:00 и 22:00 UTC) не прави нищо ново.
    const before = { calls: calls.length, res: sent.resource.length, admin: sent.admin.length };
    const again = await m.life.runCampaignCron(fb);
    expect(again).toMatchObject({ stopped: 0, posts: { posted: 0, failed: 0 }, slotsOut: 0, twoDays: 0, ended: 0, quiet: 0 });
    expect({ calls: calls.length, res: sent.resource.length, admin: sent.admin.length }).toEqual(before);
  });

  it("отказ от Meta: Снежана получава картината, текста и «Сподели»; промоцията тече", async () => {
    const { sql } = await import("drizzle-orm");
    await m.db.db.execute(sql`update campaigns set facebook_post_id = null, notified = '{}'::jsonb where id = 'p11n-up'`);
    await m.db.db.execute(sql`update campaigns set starts_on = ${today} where id = 'p11n-up'`);
    mode = "fail";
    expect(await m.face.publishStartPost("p11n-up", fb)).toBe("failed");
    mode = "ok";
    const last = sent.adminPhoto.at(-1)!;
    expect(last.url).toBe("https://www.euphoriabeauty.eu/api/og/promo/p11n-up");
    expect(last.caption).toMatch(/^Facebook не публикува поста за „Ботокс терапия за коса Xtreme Hydra“ на Снежана\. Текстът е долу, можеш да го споделиш сама\. Промоцията на сайта работи\.\n\nВ Euphoria, кв\. Левски, Варна: Ботокс терапия за коса Xtreme Hydra при Снежана, нова цена 28.€, предишна цена 35.€ \(−20%\)\./);
    expect(JSON.stringify(last.keyboard)).toContain("sharer.php?u=https%3A%2F%2Fwww.euphoriabeauty.eu%2Fpromotsii%3Fid%3Dp11n-up%26from%3Dfacebook");
    expect((await row("p11n-up"))?.status).toBe("approved");
    // Повторен опит няма (Снежана вече има текста).
    expect(await m.face.publishStartPost("p11n-up", fb)).toBe("skipped");
  });

  it("каруселът: при 1 течаща няма пост, при 2 един пост с карта на промоция", async () => {
    const { sql } = await import("drizzle-orm");
    const monday = (() => {
      let x = d(7);
      while (m.time.sofiaWeekday(x) !== 1) x = m.rules.addDays(x, 1);
      return x;
    })();
    if (m.time.sofiaWeekday(today) !== 1) expect(await m.face.postWeeklyCarousel(today, fb)).toBe("not_monday");
    // Само една течаща със свободни места.
    await m.db.db.execute(sql`update campaigns set status = 'stopped', stop_reason = 'proba_park2' where id like 'p11n-%' and status = 'approved' and id <> 'p11n-start'`);
    const n0 = calls.length;
    expect(await m.face.postWeeklyCarousel(monday, fb)).toBe("too_few");
    expect(calls.length).toBe(n0);
    // Две.
    await m.db.db.execute(sql`update campaigns set status = 'approved', stop_reason = null where id = 'p11n-two'`);
    expect(await m.face.postWeeklyCarousel(monday, fb)).toBe("posted");
    const c = calls.at(-1)!;
    expect(c.url).toBe("https://graph.facebook.com/v27.0/1234567890/feed");
    const cards = JSON.parse(c.body.child_attachments) as { link: string; picture: string; name: string; description: string }[];
    expect(cards).toHaveLength(2);
    for (const k of cards) {
      const id = k.link.match(/id=(p11n-[a-z]+)/)![1];
      expect(k.link).toBe(`https://www.euphoriabeauty.eu/promotsii?id=${id}&from=karusel#promo-${id}`);
      expect(k.picture).toBe(`https://www.euphoriabeauty.eu/api/og/promo/${id}?f=sq`);
    }
    expect(cards.map((k) => k.name).sort()).toEqual(["Дамско подстригване (къса коса)", "Педикюр с гел лак"]);
    expect(cards.find((k) => k.name === "Педикюр с гел лак")!.description).toMatch(/^При специалиста по маникюр: нова цена 24.€, предишна цена 30.€ \(−20%\)\. До .+\. Само за първо посещение\.$/);
    // Един на седмица.
    expect(await m.face.postWeeklyCarousel(monday, fb)).toBe("exists");
    await m.db.db.execute(sql`update campaigns set status = 'approved', stop_reason = null where stop_reason = 'proba_park2'`);
  });

  it("край на сътрудничеството: промоциите спират, постовете се трият; отказаното отива при Снежана", async () => {
    const { sql } = await import("drizzle-orm");
    // Още един стар пост на Виолета, който Meta отказва да изтрие.
    await m.db.db.execute(sql`update campaigns set facebook_post_id = '1234567890_666' where id = 'p11n-ended'`);
    const startPost = (await row("p11n-start"))!.facebookPostId!;
    const quietPost = (await row("p11n-quiet"))!.facebookPostId!;
    const n0 = calls.length;
    const r = await m.life.endResourceCampaigns(VIOLETA, fb);
    const deletes = calls.slice(n0).filter((c) => c.body.method === "delete").map((c) => c.url.split("/").at(-1) ?? "");
    expect(deletes).toHaveLength(4);
    expect(deletes).toEqual(expect.arrayContaining(["1234567890_666", startPost, quietPost]));
    expect(deletes.some((x) => /^1234567890_80\d+$/.test(x))).toBe(true);
    expect(r.deleted).toBe(3); // двата поста при старта и каруселът
    expect(r.failed).toEqual(["https://www.facebook.com/1234567890_666"]);
    expect((await row("p11n-start"))).toMatchObject({ status: "stopped", stopReason: "system_ended" });
    expect((await row("p11n-start"))?.facebookDeletedAt).toBeInstanceOf(Date);
    expect((await row("p11n-quiet"))?.status).toBe("stopped");
    expect(toRes(VIOLETA, /^Сътрудничеството приключи, затова промоциите са спрени\./)).toHaveLength(1);
    const msg = sent.admin.at(-1)!.text;
    expect(msg).toBe("Сътрудничеството с Виолета Проба приключи. Facebook не изтри 1 пост с промоциите. Изтрий ги ръчно:\nhttps://www.facebook.com/1234567890_666");
    const car = await m.db.db.execute(sql`select status from campaign_carousels where 'p11n-start' = any(campaign_ids)`);
    expect(((Array.isArray(car) ? car : (car as { rows: unknown[] }).rows) as { status: string }[])[0].status).toBe("deleted");
  });

  it("условната цена: цената преди бутона не зависи от телефона (не казва кой е бил клиент)", async () => {
    const { sql } = await import("drizzle-orm");
    await m.db.db.execute(sql`update campaigns set first_visit_only = true where id = 'p11n-two'`);
    const q = await m.pub.quotePublicBooking({
      resourceId: SNEZHANA,
      serviceItemIds: [KUSA],
      startAt: m.time.sofiaWallToUtc(d(1), "06:00").toISOString(),
      // Старата форма пращаше телефона; сега сървърът не го гледа.
      ...({ phone: "+359 88 311 9001" } as object),
    } as Parameters<typeof m.pub.quotePublicBooking>[0]);
    expect(q?.outcome).toMatchObject({ state: "applied", campaignId: "p11n-two", firstVisitOnly: true });
    expect(q).toMatchObject({ totalEur: 20, regularTotalEur: 25 });
  });
});
