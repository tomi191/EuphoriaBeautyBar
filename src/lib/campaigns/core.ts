import { revalidatePath } from "next/cache";
import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, schema } from "@/lib/db";
import { toEur } from "@/lib/booking/offering";
import { formatEuro } from "@/lib/booking/price";
import { isClosed } from "@/lib/booking/closures";
import { sofiaDateStr, sofiaFirstDayFrom, sofiaWallToUtc, sofiaWeekday } from "@/lib/booking/time";
import { lowestPriceLast30Days } from "@/lib/pricing/price-log";
import { adminResourceUserIds, getConsentMap } from "@/lib/data/tenant-consent";
import { notifyResource } from "@/lib/notify";
import {
  answerCallback,
  editMessageText,
  getAdminChatId,
  sendTelegramToAdmin,
  type InlineKeyboard,
} from "@/lib/telegram";
import { siteConfig } from "@/lib/site";
import {
  CAMPAIGN_TEXT,
  NOTE_MAX,
  RETURN_REASONS,
  STOP_REASONS,
  addDays,
  campaignPhase,
  checkCampaign,
  checkPassedLine,
  diffDays,
  discountRanUntil,
  displayPercent,
  isOpen,
  kindWord,
  shortDay,
  stopReasonText,
  whoLabel,
  type CampaignInput,
  type CampaignKind,
  type CampaignPhase,
  type CampaignStatus,
  type CheckContext,
  type Problem,
  type ReturnReasonKey,
  type ServiceFacts,
  type StopReasonKey,
} from "@/lib/campaigns/rules";

// Сърцевината на промоциите (№11, част 1). Без проверка за вход: викат я действията в
// lib/actions/campaigns.ts (след requireStaff / requireAdmin) и бутоните в Telegram (след проверка, че
// чатът е админ каналът). Не е "use server", затова нищо оттук не е достъпно от браузъра.

type Resource = typeof schema.resources.$inferSelect;
type CampaignRow = typeof schema.campaigns.$inferSelect;
type Fail = { ok: false; error: string; problems?: Problem[] };
const fail = (error: string, problems?: Problem[]): Fail => ({ ok: false, error, problems });

export const todaySofia = () => sofiaDateStr(new Date());

export function revalidateCampaigns() {
  revalidatePath("/staff/promotions");
  revalidatePath("/staff/services");
  revalidatePath("/admin/promotions");
  // Публичните места (част 2) четат по дата; опресняваме ги при всяко решение.
  revalidatePath("/");
  revalidatePath("/promotsii");
  revalidatePath("/uslugi", "layout");
}

// ── Кой е специалистът ──

export async function whoFor(resource: Pick<Resource, "id" | "name" | "kind" | "userId">) {
  const [admins, consent] = await Promise.all([adminResourceUserIds(), getConsentMap()]);
  const isOwner = !!resource.userId && admins.has(resource.userId);
  return {
    isOwner,
    hasConsent: !!consent[resource.id],
    label: whoLabel({ name: resource.name, kind: resource.kind, isOwner, hasConsent: !!consent[resource.id] }),
  };
}

// ── Фактите за проверките ──

/** Денят, от който се смята предишната цена: началото на промоцията (или сега, ако е почнала). */
const priceAt = (startsOn: string | null) => {
  const now = new Date();
  if (!startsOn) return now;
  const start = sofiaWallToUtc(startsOn, "00:00");
  return start > now ? start : now;
};

/** Има ли поне един ден в [startsOn, endsOn], в който специалистът приема часове. */
export async function hasWorkDay(resourceId: string, startsOn: string, endsOn: string): Promise<boolean> {
  const n = diffDays(startsOn, endsOn);
  if (n < 0 || n > 60) return false;
  const [own, salon, off] = await Promise.all([
    db.query.resourceWorkingHours.findMany({ where: (w, { eq: e }) => e(w.resourceId, resourceId) }),
    db.query.workingHours.findMany(),
    db.query.timeOff.findMany({
      where: (t, { and: a, or, eq: e, isNull, lt, gt }) =>
        a(
          or(e(t.resourceId, resourceId), isNull(t.resourceId)),
          lt(t.startAt, sofiaWallToUtc(addDays(endsOn, 1), "00:00")),
          gt(t.endAt, sofiaWallToUtc(startsOn, "00:00")),
        ),
    }),
  ]);
  for (let i = 0; i <= n; i++) {
    const day = addDays(startsOn, i);
    const wd = sofiaWeekday(day);
    const wh = own.find((w) => w.weekday === wd) ?? salon.find((w) => w.weekday === wd);
    if (!wh || wh.closed || !wh.openTime || !wh.closeTime) continue;
    if (await isClosed(day)) continue;
    const open = sofiaWallToUtc(day, wh.openTime);
    const close = sofiaWallToUtc(day, wh.closeTime);
    if (off.some((t) => t.startAt <= open && t.endAt >= close)) continue;
    return true;
  }
  return false;
}

/** Услугите, които специалистът предлага (за стъпка «Услуги» и за проверките). */
export async function myOfferedServices(resourceId: string) {
  const rows = await db
    .select({
      serviceItemId: schema.resourceServices.serviceItemId,
      name: schema.serviceItems.name,
      sortOrder: schema.serviceItems.sortOrder,
      price: schema.resourceServices.price,
      priceMax: schema.resourceServices.priceMax,
      priceFrom: schema.resourceServices.priceFrom,
      currency: schema.resourceServices.currency,
      active: schema.resourceServices.active,
      onlineBookable: schema.resourceServices.onlineBookable,
      catalogOnline: schema.serviceItems.bookableOnline,
      createdAt: schema.resourceServices.createdAt,
    })
    .from(schema.resourceServices)
    .innerJoin(schema.serviceItems, eq(schema.serviceItems.id, schema.resourceServices.serviceItemId))
    .where(eq(schema.resourceServices.resourceId, resourceId));
  return rows.sort((a, b) => a.sortOrder - b.sortOrder);
}

type CampaignWithServices = CampaignRow & { services: (typeof schema.campaignServices.$inferSelect)[] };

async function campaignsOf(resourceId: string): Promise<CampaignWithServices[]> {
  const rows = await db.query.campaigns.findMany({ where: (c, { eq: e }) => e(c.resourceId, resourceId) });
  if (rows.length === 0) return [];
  const svc = await db.query.campaignServices.findMany({ where: (s) => inArray(s.campaignId, rows.map((r) => r.id)) });
  return rows.map((r) => ({ ...r, services: svc.filter((s) => s.campaignId === r.id) }));
}

/** Заключените цени в «Услуги»: услуга → краят на чакащата или течащата промоция. */
export async function lockedServiceIds(resourceId: string): Promise<Map<string, { endsOn: string; campaignId: string }>> {
  const today = todaySofia();
  const out = new Map<string, { endsOn: string; campaignId: string }>();
  for (const c of await campaignsOf(resourceId)) {
    if (!isOpen(c, today)) continue;
    for (const s of c.services) {
      const prev = out.get(s.serviceItemId);
      if (!prev || prev.endsOn < c.endsOn) out.set(s.serviceItemId, { endsOn: c.endsOn, campaignId: c.id });
    }
  }
  return out;
}

/** Всичко, което checkCampaign иска, от базата и дневника на цените. */
export async function gatherContext(
  resourceId: string,
  input: Pick<CampaignInput, "kind" | "serviceItemIds" | "startsOn" | "endsOn">,
  opts: { excludeCampaignId?: string; forApproval?: boolean; allServices?: boolean } = {},
): Promise<CheckContext> {
  const today = todaySofia();
  const [offered, all] = await Promise.all([myOfferedServices(resourceId), campaignsOf(resourceId)]);
  const others = all.filter((c) => c.id !== opts.excludeCampaignId);
  const ids = opts.allServices ? offered.map((o) => o.serviceItemId) : [...new Set(input.serviceItemIds)];
  const at = priceAt(/^\d{4}-\d{2}-\d{2}$/.test(input.startsOn) ? input.startsOn : null);

  const services: ServiceFacts[] = await Promise.all(
    ids.map(async (id): Promise<ServiceFacts> => {
      const o = offered.find((x) => x.serviceItemId === id);
      const open = others.filter((c) => isOpen(c, today) && c.services.some((s) => s.serviceItemId === id));
      const ran = others
        .filter((c) => c.services.some((s) => s.serviceItemId === id))
        .map((c) => discountRanUntil({ ...c, stoppedOn: c.stoppedAt ? sofiaDateStr(c.stoppedAt) : null }, today))
        .filter((d): d is string => !!d)
        .sort();
      const low = o ? await lowestPriceLast30Days(resourceId, id, at) : null;
      return {
        serviceItemId: id,
        name: o?.name ?? "",
        offered: !!o?.active,
        onlineBookable: !!o && o.onlineBookable && o.catalogOnline,
        priceEur: o ? toEur(o.price, o.currency) : null,
        priceFrom: !!o?.priceFrom,
        priceMax: o?.priceMax != null ? toEur(o.priceMax, o.currency) : null,
        openCampaignUntil: open.length ? open.map((c) => c.endsOn).sort().at(-1)! : null,
        lastDiscountRanUntil: ran.at(-1) ?? null,
        lowest: {
          lowestEur: low?.lowestEur ?? null,
          discountAllowed: !!low?.discountAllowed,
          // Денят, в чието 00:00 (priceAt) намалението вече е позволено, а не денят на самия момент.
          discountAllowedFrom: low?.discountAllowedFrom ? sofiaFirstDayFrom(low.discountAllowedFrom) : null,
          reason: low?.reason ?? "no_data",
          lastChangeOn: low?.lastChangeAt ? sofiaDateStr(low.lastChangeAt) : null,
          createdOn: o?.createdAt ? sofiaDateStr(o.createdAt) : null,
        },
        lastRaiseOn: low?.lastRaiseAt ? sofiaDateStr(low.lastRaiseAt) : null,
      };
    }),
  );

  const pendingCount = others.filter((c) => c.status === "pending" && today <= c.endsOn).length;
  const activeCount = others.filter((c) => c.status === "approved" && today <= c.endsOn).length;
  const workDay =
    /^\d{4}-\d{2}-\d{2}$/.test(input.startsOn) && /^\d{4}-\d{2}-\d{2}$/.test(input.endsOn)
      ? await hasWorkDay(resourceId, input.startsOn, input.endsOn)
      : false;
  return { today, services, pendingCount, activeCount, hasWorkDay: workDay, forApproval: opts.forApproval };
}

// ── Записът ──

const clean = (s: string | null | undefined, max: number) => {
  const t = (s ?? "").replace(/\s+/g, " ").trim();
  return t ? [...t].slice(0, max).join("") : null;
};

export function normalizeInput(raw: CampaignInput): CampaignInput {
  return {
    kind: raw.kind === "gift" ? "gift" : "discount",
    serviceItemIds: [...new Set((raw.serviceItemIds ?? []).filter((x) => typeof x === "string"))],
    newPrices: Object.fromEntries(
      Object.entries(raw.newPrices ?? {}).map(([k, v]) => [k, typeof v === "number" && Number.isFinite(v) ? Math.round(v * 100) / 100 : null]),
    ),
    gift: raw.kind === "gift" ? ((raw.gift ?? "").replace(/\s+/g, " ").trim() || null) : null,
    reason: (raw.reason ?? "").replace(/\s+/g, " ").trim() || null,
    startsOn: String(raw.startsOn ?? ""),
    endsOn: String(raw.endsOn ?? ""),
    slots: raw.slots == null || (raw.slots as unknown) === "" ? null : Number(raw.slots),
    firstVisitOnly: !!raw.firstVisitOnly,
  };
}

/**
 * Изпраща промоция (нова или върната и поправена). Проверките по закона минават тук, в една транзакция със
 * заключване по специалист (двама не взимат последното място в лимита). Снежана (вход на админ) я пуска
 * одобрена; другите отиват при нея (Telegram и камбанката).
 */
export async function submitCampaignCore(
  resource: Resource,
  actorUserId: string,
  rawInput: CampaignInput,
  campaignId?: string,
): Promise<{ ok: true; id: string; status: CampaignStatus } | Fail> {
  const input = normalizeInput(rawInput);
  const who = await whoFor(resource);
  if (campaignId) {
    const existing = await db.query.campaigns.findFirst({ where: (c, { eq: e }) => e(c.id, campaignId) });
    if (!existing || existing.resourceId !== resource.id) return fail("Промоцията не е намерена.");
    if (existing.status !== "returned") return fail(CAMPAIGN_TEXT.noEdit);
  }

  const id = campaignId ?? nanoid();
  const result = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${"campaign:" + resource.id}))`);
    const ctx = await gatherContext(resource.id, input, { excludeCampaignId: id });
    const problems = checkCampaign(input, ctx);
    if (problems.length) return fail(problems[0].text, problems);

    const now = new Date();
    const status: CampaignStatus = who.isOwner ? "approved" : "pending";
    const values = {
      resourceId: resource.id,
      kind: input.kind,
      gift: input.gift,
      reason: input.reason,
      startsOn: input.startsOn,
      endsOn: input.endsOn,
      slots: input.slots,
      firstVisitOnly: input.firstVisitOnly,
      status,
      submittedAt: now,
      returnReason: null,
      returnNote: null,
      returnedAt: null,
      approvedBy: who.isOwner ? "self" : null,
      approvedAt: who.isOwner ? now : null,
      updatedAt: now,
    };
    if (campaignId) {
      await tx.update(schema.campaigns).set(values).where(eq(schema.campaigns.id, id));
      await tx.delete(schema.campaignServices).where(eq(schema.campaignServices.campaignId, id));
    } else {
      await tx.insert(schema.campaigns).values({ id, ...values, createdBy: actorUserId, createdAt: now });
    }
    await tx.insert(schema.campaignServices).values(
      input.serviceItemIds.map((sid) => {
        const f = ctx.services.find((s) => s.serviceItemId === sid)!;
        return {
          id: nanoid(),
          campaignId: id,
          serviceItemId: sid,
          prevPriceEur: input.kind === "discount" ? f.lowest.lowestEur : null,
          newPriceEur: input.kind === "discount" ? (input.newPrices[sid] ?? null) : null,
          regularPriceEur: f.priceEur,
          priceFrom: f.priceFrom,
          prevPriceAt: now,
        };
      }),
    );
    return { ok: true as const, id, status };
  });
  if (!result.ok) return result;
  revalidateCampaigns();
  if (result.status === "pending") await notifyAdminNewCampaign(id);
  else if (input.startsOn <= todaySofia()) await postIfStarted(id);
  return result;
}

/** Само проверката (за стъпките във формата): същите правила, без запис. */
export async function checkDraftCore(resource: Resource, rawInput: CampaignInput, campaignId?: string) {
  const input = normalizeInput(rawInput);
  const ctx = await gatherContext(resource.id, input, { excludeCampaignId: campaignId, allServices: true });
  const problems = checkCampaign(input, ctx);
  return { problems, services: ctx.services, today: ctx.today };
}

// ── Одобрение, връщане, спиране ──

/** Постът във Facebook за вече почнала промоция (част 4). Не хвърля; кронът хваща пропуснатото. */
async function postIfStarted(id: string) {
  try {
    const { publishStartPost } = await import("@/lib/campaigns/facebook");
    await publishStartPost(id);
  } catch (e) {
    console.error("[campaigns] постът при одобрение падна:", e instanceof Error ? e.message : String(e));
  }
}

const startedLine = (c: { startsOn: string; endsOn: string }, today: string) =>
  c.startsOn > today ? `Тръгва на ${shortDay(c.startsOn, today)}.` : `Тръгва веднага, краят е ${shortDay(c.endsOn, today)}.`;

export async function serviceTitle(campaignId: string): Promise<string> {
  const rows = await db
    .select({ name: schema.serviceItems.name })
    .from(schema.campaignServices)
    .innerJoin(schema.serviceItems, eq(schema.serviceItems.id, schema.campaignServices.serviceItemId))
    .where(eq(schema.campaignServices.campaignId, campaignId));
  return rows.map((r) => r.name).join(", ");
}

export async function approveCampaignCore(
  id: string,
  approvedBy: string,
): Promise<{ ok: true; startsLine: string } | Fail> {
  const c = await db.query.campaigns.findFirst({ where: (x, { eq: e }) => e(x.id, id) });
  if (!c) return fail("Промоцията не е намерена.");
  if (c.status !== "pending") return fail("Промоцията не чака одобрение.");
  const today = todaySofia();
  if (today > c.endsOn) return fail("Срокът на промоцията мина.");
  const svc = await db.query.campaignServices.findMany({ where: (s, { eq: e }) => e(s.campaignId, id) });
  const input: CampaignInput = {
    kind: c.kind,
    serviceItemIds: svc.map((s) => s.serviceItemId),
    newPrices: Object.fromEntries(svc.map((s) => [s.serviceItemId, s.newPriceEur])),
    gift: c.gift,
    reason: c.reason,
    startsOn: c.startsOn,
    endsOn: c.endsOn,
    slots: c.slots,
    firstVisitOnly: c.firstVisitOnly,
  };
  // Проверките наново: предишната цена се смята пак към одобрението и се пази в реда.
  const ctx = await gatherContext(c.resourceId, input, { excludeCampaignId: id, forApproval: true });
  const problems = checkCampaign(input, ctx);
  if (problems.length) return fail(`Проверката не мина: ${problems[0].text}`, problems);

  const now = new Date();
  const updated = await db.transaction(async (tx) => {
    const u = await tx
      .update(schema.campaigns)
      .set({ status: "approved", approvedBy, approvedAt: now, updatedAt: now })
      .where(and(eq(schema.campaigns.id, id), eq(schema.campaigns.status, "pending")))
      .returning({ id: schema.campaigns.id });
    if (u.length === 0) return false;
    for (const s of svc) {
      const f = ctx.services.find((x) => x.serviceItemId === s.serviceItemId);
      await tx
        .update(schema.campaignServices)
        .set({ prevPriceEur: c.kind === "discount" ? (f?.lowest.lowestEur ?? s.prevPriceEur) : null, prevPriceAt: now })
        .where(eq(schema.campaignServices.id, s.id));
    }
    return true;
  });
  if (!updated) return fail("Промоцията не чака одобрение.");
  revalidateCampaigns();
  const title = await serviceTitle(id);
  const started = c.startsOn <= today;
  await notifyResource(c.resourceId, {
    title: "Промоцията е одобрена",
    body: started
      ? `Снежана одобри промоцията „${title}“. Тръгна, краят е ${shortDay(c.endsOn, today)}.`
      : `Снежана одобри промоцията „${title}“. Тръгва на ${shortDay(c.startsOn, today)}.`,
    url: `/staff/promotions?id=${id}`,
  }).catch(() => null);
  // Решение 23: постът излиза в деня на началото; одобрена след началото излиза веднага (иначе я пуска кронът).
  if (started) await postIfStarted(id);
  return { ok: true, startsLine: `Одобрена. ${startedLine(c, today)}` };
}

export async function returnCampaignCore(id: string, reason: ReturnReasonKey, noteRaw: string | null) {
  if (!RETURN_REASONS.some((r) => r.key === reason)) return fail("Избери причина.");
  const note = clean(noteRaw, NOTE_MAX);
  if (reason === "other" && !note) return fail("Напиши причината.");
  const now = new Date();
  const u = await db
    .update(schema.campaigns)
    .set({ status: "returned", returnReason: reason, returnNote: note, returnedAt: now, updatedAt: now })
    .where(and(eq(schema.campaigns.id, id), eq(schema.campaigns.status, "pending")))
    .returning({ resourceId: schema.campaigns.resourceId });
  if (u.length === 0) return fail("Промоцията не чака одобрение.");
  revalidateCampaigns();
  const title = await serviceTitle(id);
  const because = RETURN_REASONS.find((r) => r.key === reason)!.because;
  const head =
    reason === "other"
      ? `Снежана върна промоцията „${title}“. Поправи я и я изпрати пак.`
      : `Снежана върна промоцията „${title}“ заради ${because}. Поправи я и я изпрати пак.`;
  await notifyResource(u[0].resourceId, {
    title: "Промоцията е върната",
    body: note ? `${head}\n„${note}“` : head,
    url: `/staff/promotions?id=${id}`,
  }).catch(() => null);
  return { ok: true as const };
}

/**
 * Спиране с причина (специалистът или Снежана). Часовете, записани по нея, пазят цената си: тук не се пипат.
 * Спира се чакаща или одобрена, която не е свършила.
 */
export async function stopCampaignCore(
  id: string,
  by: { kind: "staff"; resourceId: string; userId: string } | { kind: "admin"; userId: string },
  reason: StopReasonKey,
  noteRaw: string | null,
) {
  if (!STOP_REASONS.some((r) => r.key === reason)) return fail("Избери причина.");
  const note = clean(noteRaw, NOTE_MAX);
  if (reason === "other" && !note) return fail(CAMPAIGN_TEXT.stopOtherEmpty);
  const c = await db.query.campaigns.findFirst({ where: (x, { eq: e }) => e(x.id, id) });
  if (!c || (by.kind === "staff" && c.resourceId !== by.resourceId)) return fail("Промоцията не е намерена.");
  const today = todaySofia();
  if (!isOpen(c, today)) return fail("Промоцията вече не тече.");
  const now = new Date();
  const u = await db
    .update(schema.campaigns)
    .set({ status: "stopped", stopReason: reason, stopNote: note, stoppedAt: now, stoppedBy: by.userId, updatedAt: now })
    .where(and(eq(schema.campaigns.id, id), inArray(schema.campaigns.status, ["pending", "approved"])))
    .returning({ id: schema.campaigns.id });
  if (u.length === 0) return fail("Промоцията вече не тече.");
  revalidateCampaigns();

  const title = await serviceTitle(id);
  const why = stopReasonText(reason, note);
  const booked = await bookingStats([id]).then((m) => m.get(id)?.total ?? 0);
  if (by.kind === "admin") {
    await notifyResource(c.resourceId, {
      title: "Промоцията е спряна",
      body: `Снежана спря промоцията „${title}“: ${why}. Записаните часове пазят цената си.`,
      url: `/staff/promotions?id=${id}`,
    }).catch(() => null);
  } else {
    const res = await db.query.resources.findFirst({ where: (r, { eq: e }) => e(r.id, c.resourceId) });
    const owner = res ? (await whoFor(res)).isOwner : false;
    if (!owner) {
      await sendTelegramToAdmin(
        esc(`${res?.name ?? "Специалистът"} спря промоцията „${title}“: ${why}. Записани часове: ${booked}, те пазят цената си.`),
      ).catch(() => false);
    }
  }
  return { ok: true as const };
}

// ── Четене ──

export type CampaignView = {
  id: string;
  kind: CampaignKind;
  status: CampaignStatus;
  phase: CampaignPhase;
  resourceId: string;
  resourceName: string;
  who: string; // «при Снежана» / «при специалиста по маникюр»
  isOwner: boolean;
  kindWord: string;
  gift: string | null;
  reason: string | null;
  startsOn: string;
  endsOn: string;
  slots: number | null;
  firstVisitOnly: boolean;
  submittedAt: string | null;
  returnReason: ReturnReasonKey | null;
  returnNote: string | null;
  stopReason: string | null;
  stopNote: string | null;
  stoppedOn: string | null;
  approvedAt: string | null;
  services: {
    serviceItemId: string;
    name: string;
    prevEur: number | null;
    newEur: number | null;
    regularEur: number | null;
    priceFrom: boolean;
    percent: number | null;
  }[];
  stats: { total: number; site: number; app: number; phone: number; came: number; cancelled: number; noShow: number };
};

const EMPTY_STATS = { total: 0, site: 0, app: 0, phone: 0, came: 0, cancelled: 0, noShow: 0 };

/** Часовете по промоция (част 3 ги пише): общо, по път, дошли, отказани, неявили се. Отказаните не заемат място. */
export async function bookingStats(ids: string[]) {
  const out = new Map<string, typeof EMPTY_STATS>();
  if (ids.length === 0) return out;
  const rows = await db
    .select({ campaignId: schema.bookings.campaignId, status: schema.bookings.status, source: schema.bookings.source, createdBy: schema.bookings.createdBy })
    .from(schema.bookings)
    .where(and(isNotNull(schema.bookings.campaignId), inArray(schema.bookings.campaignId, ids)));
  for (const r of rows) {
    const s = { ...(out.get(r.campaignId!) ?? EMPTY_STATS) };
    if (r.status === "cancelled") s.cancelled++;
    else {
      s.total++;
      if (r.source === "online") s.site++;
      else if (r.source === "phone") s.phone++;
      else s.app++;
      if (r.status === "completed" || r.status === "arrived") s.came++;
      if (r.status === "no_show") s.noShow++;
    }
    out.set(r.campaignId!, s);
  }
  return out;
}

export async function loadCampaignViews(where: { resourceId?: string }): Promise<CampaignView[]> {
  const rows = await db.query.campaigns.findMany({
    where: where.resourceId ? (c, { eq: e }) => e(c.resourceId, where.resourceId!) : undefined,
    orderBy: (c, { desc }) => [desc(c.createdAt)],
  });
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const [svc, resources, stats] = await Promise.all([
    db
      .select({ s: schema.campaignServices, name: schema.serviceItems.name, sort: schema.serviceItems.sortOrder })
      .from(schema.campaignServices)
      .innerJoin(schema.serviceItems, eq(schema.serviceItems.id, schema.campaignServices.serviceItemId))
      .where(inArray(schema.campaignServices.campaignId, ids)),
    db.query.resources.findMany({ where: (r) => inArray(r.id, [...new Set(rows.map((x) => x.resourceId))]) }),
    bookingStats(ids),
  ]);
  const whoMap = new Map(await Promise.all(resources.map(async (r) => [r.id, { r, w: await whoFor(r) }] as const)));
  const today = todaySofia();
  return rows.map((c) => {
    const res = whoMap.get(c.resourceId);
    return {
      id: c.id,
      kind: c.kind,
      status: c.status,
      phase: campaignPhase(c, today),
      resourceId: c.resourceId,
      resourceName: res?.r.name ?? "",
      who: res?.w.label ?? "",
      isOwner: !!res?.w.isOwner,
      kindWord: kindWord(res?.r.kind ?? ""),
      gift: c.gift,
      reason: c.reason,
      startsOn: c.startsOn,
      endsOn: c.endsOn,
      slots: c.slots,
      firstVisitOnly: c.firstVisitOnly,
      submittedAt: c.submittedAt?.toISOString() ?? null,
      returnReason: (c.returnReason as ReturnReasonKey | null) ?? null,
      returnNote: c.returnNote,
      stopReason: c.stopReason,
      stopNote: c.stopNote,
      stoppedOn: c.stoppedAt ? sofiaDateStr(c.stoppedAt) : null,
      approvedAt: c.approvedAt?.toISOString() ?? null,
      services: svc
        .filter((x) => x.s.campaignId === c.id)
        .sort((a, b) => a.sort - b.sort)
        .map(({ s, name }) => ({
          serviceItemId: s.serviceItemId,
          name,
          prevEur: s.prevPriceEur,
          newEur: s.newPriceEur,
          regularEur: s.regularPriceEur,
          priceFrom: s.priceFrom,
          percent: s.prevPriceEur != null && s.newPriceEur != null ? displayPercent(s.prevPriceEur, s.newPriceEur) : null,
        })),
      stats: stats.get(c.id) ?? EMPTY_STATS,
    };
  });
}

/** Чакащите за камбанката в администрацията (Саиф 5.12). */
export async function pendingCampaignBellItems(since: Date) {
  const rows = await db.query.campaigns.findMany({
    where: (c, { and: a, eq: e, gte }) => a(e(c.status, "pending"), gte(c.updatedAt, since)),
    orderBy: (c, { desc }) => [desc(c.updatedAt)],
    limit: 20,
  });
  const out = [];
  for (const c of rows) {
    const res = await db.query.resources.findFirst({ where: (r, { eq: e }) => e(r.id, c.resourceId), columns: { name: true } });
    out.push({
      id: `${c.id}:campaign_pending`,
      kind: "campaign_pending" as const,
      title: "Нова промоция за одобрение",
      detail: [await serviceTitle(c.id), res?.name].filter(Boolean).join(", "),
      at: (c.submittedAt ?? c.updatedAt).toISOString(),
      href: "/admin/promotions",
    });
  }
  return out;
}

// ── Telegram до Снежана и бутоните ──

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const siteBase = () => process.env.NEXT_PUBLIC_SITE_URL ?? siteConfig.url;

/** Текстът на картата в Telegram (Саиф 5.1 и 5.2). */
export function telegramCardText(v: CampaignView, today: string): string {
  const lines = [`<b>${esc(`Нова промоция от ${v.isOwner ? "Снежана" : v.resourceName}`)}</b>`];
  for (const s of v.services) {
    if (v.kind === "discount" && s.prevEur != null && s.newEur != null) {
      lines.push(esc(`${s.name}: нова цена ${formatEuro(s.newEur)}, предишна цена ${formatEuro(s.prevEur)} (−${s.percent}%)`));
    } else {
      const price = s.regularEur != null ? `${s.priceFrom ? "от " : ""}${formatEuro(s.regularEur)}` : "";
      lines.push(esc(`${s.name}: цена ${price}. Подарък в същия час: ${v.gift ?? ""}.`));
    }
  }
  const cond = [`От ${shortDay(v.startsOn, today)} до ${shortDay(v.endsOn, today)}.`];
  if (v.slots) cond.push(`Места: ${v.slots}.`);
  if (v.firstVisitOnly) cond.push("Само за първо посещение.");
  lines.push(esc(cond.join(" ")));
  if (v.reason) lines.push(esc(`Защо: ${v.reason}`));
  const prev = v.services[0]?.prevEur ?? null;
  lines.push(esc(checkPassedLine(v, prev, "telegram")));
  return lines.join("\n");
}

function decisionKeyboard(id: string): InlineKeyboard {
  return {
    inline_keyboard: [
      [
        { text: "Одобри", callback_data: `cmp:ok:${id}` },
        { text: "Върни", callback_data: `cmp:rj:${id}` },
      ],
    ],
  };
}

function reasonsKeyboard(id: string): InlineKeyboard {
  return {
    inline_keyboard: [
      RETURN_REASONS.filter((r) => r.key !== "other").map((r, i) => ({ text: r.label, callback_data: `cmp:rr:${id}:${i}` })),
      [{ text: "Друго", url: `${siteBase()}/admin/promotions?return=${id}` }],
      [{ text: "Назад", callback_data: `cmp:bk:${id}` }],
    ],
  };
}

async function loadView(id: string): Promise<CampaignView | null> {
  const c = await db.query.campaigns.findFirst({ where: (x, { eq: e }) => e(x.id, id), columns: { resourceId: true } });
  if (!c) return null;
  return (await loadCampaignViews({ resourceId: c.resourceId })).find((v) => v.id === id) ?? null;
}

/** Нова или поправена промоция → Снежана в Telegram с картата и бутоните. Не хвърля. */
export async function notifyAdminNewCampaign(id: string): Promise<boolean> {
  try {
    const v = await loadView(id);
    if (!v || v.status !== "pending") return false;
    const sent = await sendTelegramToAdmin(telegramCardText(v, todaySofia()), decisionKeyboard(id));
    if (!sent && (await getAdminChatId())) console.error("[campaigns] известието до Снежана не тръгна:", id);
    return sent;
  } catch (e) {
    console.error("[campaigns] известието до Снежана падна:", e instanceof Error ? e.message : String(e));
    return false;
  }
}

export function parseCampaignCallback(data: string | undefined) {
  const m = (data ?? "").match(/^cmp:(ok|rj|bk|rr):([\w-]{1,40})(?::(\d))?$/);
  if (!m) return null;
  if (m[1] === "rr") {
    const i = Number(m[3]);
    const reasons = RETURN_REASONS.filter((r) => r.key !== "other");
    if (!(i >= 0 && i < reasons.length)) return null;
    return { action: "rr" as const, id: m[2], reason: reasons[i].key };
  }
  return { action: m[1] as "ok" | "rj" | "bk", id: m[2] };
}

type TgCallback = { id: string; data?: string; message?: { message_id?: number; chat?: { id?: number | string } } };

/** «Одобри», «Върни», причините и «Назад» под картата. Само от админ канала. true = беше за промоция. */
export async function handleCampaignCallback(cb: TgCallback): Promise<boolean> {
  const parsed = parseCampaignCallback(cb.data);
  if (!parsed) return false;
  const chatId = cb.message?.chat?.id;
  const messageId = cb.message?.message_id;
  const adminChat = await getAdminChatId();
  if (chatId === undefined || messageId === undefined || !adminChat || String(chatId) !== adminChat) {
    await answerCallback(cb.id);
    return true;
  }
  const today = todaySofia();
  const v = await loadView(parsed.id);
  if (!v) {
    await answerCallback(cb.id, "Промоцията не е намерена.");
    await editMessageText(chatId, messageId, "Промоцията вече я няма.", { inline_keyboard: [] });
    return true;
  }
  const card = telegramCardText(v, today);
  if (v.status !== "pending") {
    const state =
      v.status === "approved" ? "Вече е одобрена." : v.status === "returned" ? "Вече е върната." : "Вече е спряна.";
    await answerCallback(cb.id, state);
    await editMessageText(chatId, messageId, `${card}\n\n<b>${esc(state)}</b>`, { inline_keyboard: [] });
    return true;
  }
  switch (parsed.action) {
    case "ok": {
      const r = await approveCampaignCore(v.id, "telegram");
      await answerCallback(cb.id, r.ok ? r.startsLine : r.error);
      if (r.ok) await editMessageText(chatId, messageId, `${card}\n\n<b>${esc(r.startsLine)}</b>`, { inline_keyboard: [] });
      else await editMessageText(chatId, messageId, `${card}\n\n<b>${esc(r.error)}</b>`, decisionKeyboard(v.id));
      return true;
    }
    case "rj":
      await answerCallback(cb.id);
      await editMessageText(chatId, messageId, `${card}\n\n<b>Защо я връщаш?</b>`, reasonsKeyboard(v.id));
      return true;
    case "bk":
      await answerCallback(cb.id);
      await editMessageText(chatId, messageId, card, decisionKeyboard(v.id));
      return true;
    case "rr": {
      const r = await returnCampaignCore(v.id, parsed.reason!, null);
      const because = RETURN_REASONS.find((x) => x.key === parsed.reason)!.because;
      const line = `Върната заради ${because}.`;
      await answerCallback(cb.id, r.ok ? line : r.error);
      if (r.ok) await editMessageText(chatId, messageId, `${card}\n\n<b>${esc(line)}</b>`, { inline_keyboard: [] });
      return true;
    }
  }
}
