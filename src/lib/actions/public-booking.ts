"use server";

import { nanoid } from "nanoid";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getDaySlots, isStartBookable, type DaySlot } from "@/lib/booking/slots";
import { sofiaDateStr } from "@/lib/booking/time";
import { findFirstFreeDay } from "@/lib/booking/day-label";
import { formatEuro, formatServicePrice } from "@/lib/booking/price";
import { lockPromoSlots, resolveBookingPrice, resolveOffering, type BookingPrice } from "@/lib/booking/offering";
import { promoDoneLine, promoStaffLine, type PromoOutcome } from "@/lib/campaigns/booking-promo";
import { getReadiness, isReady } from "@/lib/booking/readiness";
import { siteConfig } from "@/lib/site";
import { sendBookingConfirmation, sendSalonNotification, formatWhen } from "@/lib/email/booking";
import { notifyResource, notifyAdmin } from "@/lib/notify";

export interface DayScheduleResult {
  open: string | null;
  close: string | null;
  slots: DaySlot[];
}

/**
 * Дневен график за публичната форма (без auth, с минимално предизвестие).
 * Приема обща продължителност директно — поддържа и единична, и няколко
 * последователни услуги (сумарно време).
 */
export async function fetchPublicSlots(
  resourceId: string,
  dateStr: string,
  durationMin: number,
  bufferMin: number,
  allowParallel = false,
): Promise<DayScheduleResult> {
  if (!resourceId || !durationMin || durationMin <= 0) return { open: null, close: null, slots: [] };
  const res = await getDaySlots({ resourceId, durationMin, bufferMin, dateStr, minNoticeMin: 60, allowParallel });
  if (!res) return { open: null, close: null, slots: [] };
  return res;
}

/** Колко дни напред се търси първият свободен ден (текстът на формата казва същото число). */
const FIRST_FREE_RANGE_DAYS = 60;

/**
 * Първият ден от днес нататък, в който има свободен (или паралелен) час за
 * специалиста и общото време. Ползва същата сметка като графика във формата
 * (`fetchPublicSlots`), ден по ден; няма такъв в 60 дни → null.
 */
export async function fetchFirstFreeDay(
  resourceId: string,
  durationMin: number,
  bufferMin: number,
  allowParallel = false,
): Promise<string | null> {
  if (!resourceId || !durationMin || durationMin <= 0) return null;
  return findFirstFreeDay(sofiaDateStr(new Date()), FIRST_FREE_RANGE_DAYS, async (dateStr) => {
    const res = await fetchPublicSlots(resourceId, dateStr, durationMin, bufferMin, allowParallel);
    return res.slots.some((s) => s.status === "free" || s.status === "parallel");
  });
}

/** Потвърждава имейла на клиент по token (от линка в потвърждението). */
/** Цената, която «Твоят час» показва преди бутона (№11, част 3): редовна или по промоцията, с причината. */
export interface PublicQuote {
  outcome: PromoOutcome;
  totalEur: number | null;
  regularTotalEur: number | null;
}
const toQuote = (p: BookingPrice): PublicQuote => ({ outcome: p.outcome, totalEur: p.totalEur, regularTotalEur: p.regularTotalEur });

const quoteSchema = z.object({
  resourceId: z.string().min(1),
  serviceItemIds: z.array(z.string().min(1)).min(1).max(10),
  startAt: z.string(),
  promoId: z.string().max(40).nullable().optional(),
});

/**
 * Цената на часа с промоцията, преди бутона. Същата сметка като при записа (resolveBookingPrice), но без
 * телефона и имейла (част 4, 5а): заявката е без вход и не бива да казва дали даден телефон е имал час при
 * специалиста. При «само първо посещение» формата показва двете цени условно; коя важи решава записът.
 */
export async function quotePublicBooking(input: z.infer<typeof quoteSchema>): Promise<PublicQuote | null> {
  const parsed = quoteSchema.safeParse(input);
  if (!parsed.success) return null;
  const d = parsed.data;
  const start = new Date(d.startAt);
  if (Number.isNaN(start.getTime())) return null;
  const priced = await resolveBookingPrice({
    resourceId: d.resourceId,
    serviceItemIds: d.serviceItemIds,
    startAt: start,
    client: null,
    promoId: d.promoId ?? null,
  });
  return toQuote(priced);
}

/** Откъде е дошъл клиентът (bookings.came_from): само «from» и UTM от адреса, изчистени, до 200 знака. */
function cleanCameFrom(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const q = new URLSearchParams(raw.startsWith("?") ? raw.slice(1) : raw);
  const out = new URLSearchParams();
  for (const k of ["from", "utm_source", "utm_medium", "utm_campaign", "utm_content"]) {
    const v = (q.get(k) ?? "").replace(/[^\p{L}\p{N}_.\-]/gu, "").slice(0, 60);
    if (v) out.set(k, v);
  }
  if (![...out.keys()].length && q.get("promo")) out.set("from", "promo");
  const s = out.toString();
  return s ? s.slice(0, 200) : null;
}

export async function verifyEmailToken(token: string): Promise<boolean> {
  if (!token) return false;
  const client = await db.query.clients.findFirst({ where: (c, { eq }) => eq(c.verifyToken, token) });
  if (!client) return false;
  await db
    .update(schema.clients)
    .set({ emailVerified: true, verifyToken: null })
    .where(eq(schema.clients.id, client.id));
  return true;
}

const publicSchema = z.object({
  resourceId: z.string().min(1),
  serviceItemId: z.string().nullable().optional(), // null при няколко услуги (комбиниран запис)
  serviceItemIds: z.array(z.string()).max(10).optional(), // при комбиниран запис — за сумарна цена в оборота
  serviceName: z.string().min(1).max(200),
  priceLabel: z.string().max(200).nullable().optional(), // показва се в имейла (особено при няколко услуги)
  // priceEur НЕ идва от клиента (можеше priceEur:0 → € 0 в оборота) — снима се server-side.
  durationMin: z.number().int().positive().max(1440),
  bufferMin: z.number().int().min(0).max(120),
  startAt: z.string(),
  clientName: z.string().min(2).max(100),
  clientPhone: z
    .string()
    .min(5)
    .max(30)
    .refine((v) => (v.match(/\d/g)?.length ?? 0) >= 6, "Въведи валиден телефонен номер (само букви не се приемат)."),
  clientEmail: z.string().email(),
  consentLate: z.literal(true),
  allowParallel: z.boolean().optional(),
  // №11, част 3: сумата, която клиентът е видял преди бутона. Ако цената вече е друга (местата свършиха,
  // промоцията спря), часът не се записва и формата показва новата цена и защо. Не определя цената.
  expectedTotalEur: z.number().nullable().optional(),
  // «Само първо посещение»: редовната цена, видяна като «иначе …»; важи само ако записът реши, че не е първо.
  expectedAltEur: z.number().nullable().optional(),
  promoId: z.string().max(40).nullable().optional(),
  // Адресът, от който е отворена формата (from и UTM от рекламата).
  cameFrom: z.string().max(500).nullable().optional(),
});

export type PublicBookingInput = z.infer<typeof publicSchema>;

// Anti-abuse: не повече от RL_MAX записа на един клиент (имейл/телефон) за RL_WINDOW_MIN
// минути → спира email bombing / спам записи. DB-based (serverless няма обща памет).
const RL_WINDOW_MIN = 10;
const RL_MAX = 3;

export async function createPublicBooking(input: PublicBookingInput) {
  // safeParse (не parse): невалидни данни връщат приятелско съобщение във формата,
  // вместо ZodError → generic „Възникна грешка".
  const parsed = publicSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Провери въведените данни." };
  }
  const data = parsed.data;

  // Изключен (напуснал) изпълнител е скрит от формата, но директна заявка може да го подаде.
  const performer = await db.query.resources.findFirst({
    where: (r, { eq }) => eq(r.id, data.resourceId),
    columns: { active: true },
  });
  if (!performer?.active) {
    return { ok: false as const, error: "Този специалист вече не приема онлайн записи. Избери друг или се обади в салона." };
  }
  // Нов изпълнител без своя услуга е скрит от формата; същото и тук.
  if (!isReady((await getReadiness([data.resourceId])).get(data.resourceId))) {
    return { ok: false as const, error: "Този специалист още не приема онлайн записи. Избери друг или се обади в салона." };
  }

  const since = new Date(Date.now() - RL_WINDOW_MIN * 60000);
  const rlClients = await db.query.clients.findMany({
    where: (c, { or, eq }) => or(eq(c.email, data.clientEmail), eq(c.phone, data.clientPhone)),
    columns: { id: true },
  });
  if (rlClients.length) {
    const ids = rlClients.map((c) => c.id);
    const recent = await db.query.bookings.findMany({
      where: (b, { and, gte, inArray }) => and(gte(b.createdAt, since), inArray(b.clientId, ids)),
      columns: { id: true },
    });
    if (recent.length >= RL_MAX) {
      return { ok: false as const, error: "Твърде много заявки за кратко време. Опитай след малко или се обади." };
    }
  }

  const start = new Date(data.startAt);

  // Офертата се резолюрва СЪРВЪРНО (не се вярва на клиентски duration/buffer/price):
  // собствената цена/време на изпълнителя печели пред каталожната. При комбиниран
  // запис сумираме продължителностите на всички избрани услуги.
  const single = data.serviceItemId ? await resolveOffering(data.resourceId, data.serviceItemId) : null;
  const combined = !single && data.serviceItemIds?.length
    ? await Promise.all(data.serviceItemIds.map((sid) => resolveOffering(data.resourceId, sid)))
    : null;

  const durationMin = single?.durationMin
    ?? combined?.reduce((s, o) => s + o.durationMin, 0)
    ?? data.durationMin;
  const bufferMin = single?.bufferMin
    ?? combined?.reduce((s, o) => s + o.bufferMin, 0)
    ?? data.bufferMin;
  const end = new Date(start.getTime() + (durationMin + bufferMin) * 60000);

  // Защита: не приемаме онлайн запис, ако изпълнителят е спрял онлайн записа за услуга
  // (единична или коя да е от комбинираните).
  // Сървърно налагане: слотовете се филтрират при показване, но директен POST може да
  // подаде скрита/непредлагана услуга. Изискваме видим каталог + активна оферта.
  const notOffered = "Тази услуга не се предлага онлайн от избрания специалист.";
  if (single && (!single.catalogVisible || !single.offered)) {
    return { ok: false as const, error: notOffered };
  }
  if (combined?.some((o) => !o.catalogVisible || !o.offered)) {
    return { ok: false as const, error: notOffered };
  }
  if (single && !single.onlineBookable) {
    return { ok: false as const, error: "Тази услуга не се записва онлайн при този изпълнител. Обади се за час." };
  }
  if (combined?.some((o) => !o.onlineBookable)) {
    return { ok: false as const, error: "Една от услугите не се записва онлайн при този изпълнител. Обади се за час." };
  }

  // Авторитетна валидация: startAt трябва да е реален свободен/паралелен слот в
  // работното време (не минал, не под предизвестие, не зает, не при затворен график).
  // Една и съща логика като графика, който клиентът е видял → без несъгласуваност.
  const check = await isStartBookable({
    resourceId: data.resourceId,
    startISO: data.startAt,
    durationMin,
    bufferMin,
    allowParallel: data.allowParallel === true,
    activeMin: single?.activeMin ?? 0,
    processingMin: single?.processingMin ?? 0,
  });
  if (!check.ok) return { ok: false as const, error: check.reason };

  // Цената (€) с промоцията се решава вътре в записа (resolveBookingPrice), след заключването на местата.
  const priceIds = data.serviceItemId ? [data.serviceItemId] : (data.serviceItemIds ?? []);

  // upsert клиент по имейл; генерира verify token за неверифицирани (онбординг)
  let clientId: string;
  let verifyToken: string | null = null;
  const existing = await db.query.clients.findFirst({ where: (c, { eq }) => eq(c.email, data.clientEmail) });
  if (existing) {
    clientId = existing.id;
    if (!existing.emailVerified) {
      verifyToken = existing.verifyToken ?? nanoid(32);
      await db
        .update(schema.clients)
        .set({ name: data.clientName, phone: data.clientPhone, verifyToken })
        .where(eq(schema.clients.id, clientId));
    }
  } else {
    clientId = nanoid();
    verifyToken = nanoid(32);
    await db.insert(schema.clients).values({
      id: clientId,
      name: data.clientName,
      email: data.clientEmail,
      phone: data.clientPhone,
      verifyToken,
      createdAt: new Date(),
    });
  }

  try {
    const id = nanoid();
    const saved = await db.transaction(async (tx) => {
      await lockPromoSlots(tx, data.resourceId, priceIds);
      const priced = await resolveBookingPrice(
        {
          resourceId: data.resourceId,
          serviceItemIds: priceIds,
          startAt: start,
          client: { phone: data.clientPhone, email: data.clientEmail },
          promoId: data.promoId,
        },
        tx,
      );
      const seen = data.expectedTotalEur;
      const same = (x: number | null) =>
        x == null ? priced.totalEur == null : priced.totalEur != null && Math.abs(x - priced.totalEur) <= 0.005;
      const notFirst = priced.outcome.state === "refused" && priced.outcome.reason === "not_first";
      const changed =
        seen !== undefined && !same(seen) && !(notFirst && data.expectedAltEur !== undefined && same(data.expectedAltEur));
      if (changed) return { changed: true as const, priced };
      await tx.insert(schema.bookings).values({
      id,
      resourceId: data.resourceId,
      serviceItemId: data.serviceItemId ?? null,
      serviceName: data.serviceName,
      clientId,
      startAt: start,
      endAt: end,
      status: "confirmed",
      activeMin: single?.activeMin ?? 0,
      processingMin: single?.processingMin ?? 0,
      allowParallel: data.allowParallel === true,
      source: "online",
      priceEur: priced.totalEur, // server authority (собствена цена > каталожна, промоцията) — не от клиента
      campaignId: priced.campaignId,
      regularPriceEur: priced.campaignId ? priced.regularTotalEur : null,
      cameFrom: cleanCameFrom(data.cameFrom),
      consentLate: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      });
      return { changed: false as const, priced };
    });
    if (saved.changed) return { ok: false as const, error: "", quote: toQuote(saved.priced) };
    const priced = saved.priced;
    const o = priced.outcome;

    // Имейли (потвърждение към клиента + известие към салона). Не блокират записа при грешка.
    const [resource, item] = await Promise.all([
      db.query.resources.findFirst({ where: (r, { eq }) => eq(r.id, data.resourceId) }),
      data.serviceItemId
        ? db.query.serviceItems.findFirst({ where: (s, { eq }) => eq(s.id, data.serviceItemId as string) })
        : Promise.resolve(undefined),
    ]);
    const performerName = resource?.name ?? "екипа на Euphoria";
    const priceLabel =
      o.state === "applied" && o.kind === "discount" && priced.totalEur != null
        ? formatEuro(priced.totalEur)
        : (data.priceLabel ?? (item ? formatServicePrice(item) : undefined));
    const promoTitle =
      o.state === "applied"
        ? o.serviceItemId === data.serviceItemId
          ? data.serviceName
          : ((await db.query.serviceItems.findFirst({ where: (s, { eq }) => eq(s.id, o.serviceItemId), columns: { name: true } }))
              ?.name ?? data.serviceName)
        : data.serviceName;
    const staffPromoLine = promoStaffLine(o, promoTitle, formatWhen(start), priced.totalEur);
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? siteConfig.url;
    const verifyUrl = verifyToken ? `${base}/verify-email?token=${verifyToken}` : undefined;
    const [clientEmailRes, salonEmailRes, staffRes, adminTgRes] = await Promise.allSettled([
      sendBookingConfirmation(data.clientEmail, {
        clientName: data.clientName,
        serviceName: data.serviceName,
        performerName,
        start,
        priceLabel,
        promoLine: promoDoneLine(o, priced, "email"),
        verifyUrl,
        cancelUrl: `${base}/otkazhi-chas/${id}`,
      }),
      sendSalonNotification({
        clientName: data.clientName,
        serviceName: data.serviceName,
        performerName,
        start,
        priceLabel,
        clientPhone: data.clientPhone,
        clientEmail: data.clientEmail,
      }),
      notifyResource(data.resourceId, {
        title: "Нов запис",
        body: `${data.serviceName} — ${formatWhen(start)} (${data.clientName})${staffPromoLine ? `\n${staffPromoLine}` : ""}`,
        url: "/staff",
        clientPhone: data.clientPhone,
        dateKey: sofiaDateStr(start),
      }),
      notifyAdmin({
        title: "Нов онлайн запис",
        body: `${data.serviceName} — ${formatWhen(start)} (${data.clientName})`,
        performerName,
        clientPhone: data.clientPhone,
        dateKey: sofiaDateStr(start),
      }),
    ]);

    // Резултатът по канал → notify_log (диагностика „защо не ме извести"). Best-effort.
    const staff = staffRes.status === "fulfilled" ? staffRes.value : { push: { sent: 0, failed: 0 }, telegram: false };
    try {
      await db
        .update(schema.bookings)
        .set({
          notifyLog: {
            at: new Date().toISOString(),
            push: staff.push,
            telegram: staff.telegram,
            adminTelegram: adminTgRes.status === "fulfilled" ? adminTgRes.value : false,
            clientEmail: clientEmailRes.status === "fulfilled" ? clientEmailRes.value : false,
            salonEmail: salonEmailRes.status === "fulfilled" ? salonEmailRes.value : false,
          },
        })
        .where(eq(schema.bookings.id, id));
    } catch {
      // логът е диагностика, не бива да проваля записа
    }

    return { ok: true as const, id, quote: toQuote(priced) };
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e?.code === "23P01" || (e?.message ?? "").includes("bookings_no_overlap")) {
      return { ok: false as const, error: "Този час току-що беше зает. Избери друг." };
    }
    throw err;
  }
}
