"use server";

import { nanoid } from "nanoid";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getDaySlots, hasTimeOffConflict, type DaySlot } from "@/lib/booking/slots";
import { fitsParallelWindow } from "@/lib/booking/parallel";
import { formatServicePrice } from "@/lib/booking/price";
import { siteConfig } from "@/lib/site";
import { sendBookingConfirmation, sendSalonNotification, formatWhen } from "@/lib/email/booking";
import { sendPushToResource } from "@/lib/push";

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
  serviceName: z.string().min(1),
  priceLabel: z.string().nullable().optional(), // показва се в имейла (особено при няколко услуги)
  priceEur: z.number().nonnegative().nullable().optional(), // снимка на сумата (€) за оборот статистиката
  durationMin: z.number().int().positive(),
  bufferMin: z.number().int().min(0),
  startAt: z.string(),
  clientName: z.string().min(2),
  clientPhone: z.string().min(5),
  clientEmail: z.string().email(),
  consentLate: z.literal(true),
  allowParallel: z.boolean().optional(),
});

export type PublicBookingInput = z.infer<typeof publicSchema>;

export async function createPublicBooking(input: PublicBookingInput) {
  const data = publicSchema.parse(input);
  const start = new Date(data.startAt);
  const end = new Date(start.getTime() + (data.durationMin + data.bufferMin) * 60000);

  // Не приемаме час в период на отпуск/почивка на изпълнителя.
  if (await hasTimeOffConflict(data.resourceId, start, end)) {
    return { ok: false as const, error: "Този час вече не е свободен. Избери друг." };
  }

  // Паралелен час: трябва да се събира в свободен престой на чужд (хост) запис.
  if (data.allowParallel && !(await fitsParallelWindow(data.resourceId, start, end))) {
    return { ok: false as const, error: "Този паралелен час не се събира в свободния престой." };
  }

  // Снимка на активното/престой времето от каталожната услуга (0/0 при няколко услуги).
  const snapItem = data.serviceItemId
    ? await db.query.serviceItems.findFirst({ where: (s, { eq }) => eq(s.id, data.serviceItemId as string) })
    : undefined;

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
      activeMin: snapItem?.activeMin ?? 0,
      processingMin: snapItem?.processingMin ?? 0,
      allowParallel: data.allowParallel === true,
      source: "online",
      priceEur: data.priceEur ?? null,
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
      sendPushToResource(data.resourceId, {
        title: "Нов запис",
        body: `${data.serviceName} — ${formatWhen(start)} (${data.clientName})`,
        url: "/staff",
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
