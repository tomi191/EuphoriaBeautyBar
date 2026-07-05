"use server";

import { nanoid } from "nanoid";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getDaySlots, isStartBookable, type DaySlot } from "@/lib/booking/slots";
import { sofiaDateStr } from "@/lib/booking/time";
import { formatServicePrice } from "@/lib/booking/price";
import { resolveOffering, sumOfferingPrices } from "@/lib/booking/offering";
import { siteConfig } from "@/lib/site";
import { sendBookingConfirmation, sendSalonNotification, formatWhen } from "@/lib/email/booking";
import { notifyResource } from "@/lib/notify";

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

/** Потвърждава имейла на клиент по token (от линка в потвърждението). */
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

  // Снимка на цената (€): собствената цена печели; комбиниран запис → сбор.
  const priceEurSnap = single
    ? single.priceEur
    : data.serviceItemIds?.length
      ? await sumOfferingPrices(data.resourceId, data.serviceItemIds)
      : null;

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
    await db.insert(schema.bookings).values({
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
      priceEur: priceEurSnap, // server authority (собствена цена > каталожна) — не от клиента
      consentLate: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Имейли (потвърждение към клиента + известие към салона). Не блокират записа при грешка.
    const [resource, item] = await Promise.all([
      db.query.resources.findFirst({ where: (r, { eq }) => eq(r.id, data.resourceId) }),
      data.serviceItemId
        ? db.query.serviceItems.findFirst({ where: (s, { eq }) => eq(s.id, data.serviceItemId as string) })
        : Promise.resolve(undefined),
    ]);
    const performerName = resource?.name ?? "екипа на Euphoria";
    const priceLabel = data.priceLabel ?? (item ? formatServicePrice(item) : undefined);
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? siteConfig.url;
    const verifyUrl = verifyToken ? `${base}/verify-email?token=${verifyToken}` : undefined;
    await Promise.allSettled([
      sendBookingConfirmation(data.clientEmail, {
        clientName: data.clientName,
        serviceName: data.serviceName,
        performerName,
        start,
        priceLabel,
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
        body: `${data.serviceName} — ${formatWhen(start)} (${data.clientName})`,
        url: "/staff",
        clientPhone: data.clientPhone,
        dateKey: sofiaDateStr(start),
      }),
    ]);

    return { ok: true as const, id };
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e?.code === "23P01" || (e?.message ?? "").includes("bookings_no_overlap")) {
      return { ok: false as const, error: "Този час току-що беше зает. Избери друг." };
    }
    throw err;
  }
}
