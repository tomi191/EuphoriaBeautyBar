"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { and, count, desc, eq, gte } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { requireAdmin } from "@/lib/actions/auth-guard";
import { getListingBySlug } from "@/lib/data/rental-listings";
import { listingPosition } from "@/lib/rental/listing-rules";
import { notifyRentalInquiry } from "@/lib/rental/inquiry-notify";
import {
  INQUIRY_COPY,
  INQUIRY_LIMITS,
  INQUIRY_MAX_PER_IP,
  INQUIRY_MAX_PER_PHONE,
  INQUIRY_RATE_WINDOW_MIN,
  validateInquiry,
  type InquiryFieldErrors,
} from "@/lib/rental/inquiry-rules";

/*
 * Запитванията от обявата «Място под наем».
 * submitRentalInquiry е за гости (без вход). Другите три са само за администратор (за списъка в
 * администрацията, «Места под наем» → «Запитвания»). Запитванията никога не излизат в публичните страници.
 */

const ri = schema.rentalInquiries;

export type SubmitInquiryResult =
  | { ok: true }
  | { ok: false; fieldErrors?: InquiryFieldErrors; error?: string };

const submitSchema = z.object({
  slug: z.string().min(1).max(120),
  token: z.string().min(10).max(64),
  name: z.string().max(200),
  phone: z.string().max(60),
  specialty: z.string().max(200),
  message: z.string().max(INQUIRY_LIMITS.message * 2),
  consent: z.boolean(),
  /** Капанът: скрито поле, което човек не вижда и не попълва. */
  website: z.string().max(500).optional(),
});

async function clientIpHash(): Promise<string | null> {
  const h = await headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "").trim();
  if (!ip) return null;
  return createHash("sha256")
    .update(`${process.env.BETTER_AUTH_SECRET ?? ""}:rental-inquiry:${ip}`)
    .digest("hex")
    .slice(0, 32);
}

/** Изпращане на запитване от обявата (гост). */
export async function submitRentalInquiry(input: z.input<typeof submitSchema>): Promise<SubmitInquiryResult> {
  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: INQUIRY_COPY.errSend };
  const data = parsed.data;

  // Капанът е попълнен: робот. Отговаряме като при успех и не пишем запитване, но оставяме ред в
  // лога без лични данни (ако браузър попълни полето вместо човек, да личи, че се е случило).
  if (data.website && data.website.trim() !== "") {
    const ip = await clientIpHash();
    console.info("[rental-inquiry] капанът е попълнен: запитване не е записано (адрес %s)", ip ? ip.slice(0, 8) : "няма");
    return { ok: true };
  }

  const checked = validateInquiry(data);
  if (!checked.ok) return { ok: false, fieldErrors: checked.errors };
  const v = checked.value;

  const listing = await getListingBySlug(data.slug);
  if (!listing) return { ok: false, error: INQUIRY_COPY.errSend };
  if (listing.status !== "published") return { ok: false, error: INQUIRY_COPY.errFilled };

  // Второ натискане със същия ключ: вече е записано.
  const dup = await db.query.rentalInquiries.findFirst({
    where: (r, { eq: e }) => e(r.clientToken, data.token),
    columns: { id: true },
  });
  if (dup) return { ok: true };

  const since = new Date(Date.now() - INQUIRY_RATE_WINDOW_MIN * 60000);
  const ipHash = await clientIpHash();
  const [[byPhone], byIp] = await Promise.all([
    db.select({ n: count() }).from(ri).where(and(eq(ri.phone, v.phone), gte(ri.createdAt, since))),
    ipHash
      ? db.select({ n: count() }).from(ri).where(and(eq(ri.ipHash, ipHash), gte(ri.createdAt, since)))
      : Promise.resolve([{ n: 0 }]),
  ]);
  if (byPhone.n >= INQUIRY_MAX_PER_PHONE) return { ok: false, error: INQUIRY_COPY.errPhoneLimit };
  if (byIp[0].n >= INQUIRY_MAX_PER_IP) return { ok: false, error: INQUIRY_COPY.errIpLimit };

  const id = nanoid();
  const now = new Date();
  const inserted = await db
    .insert(ri)
    .values({
      id,
      positionId: listing.id,
      name: v.name,
      phone: v.phone,
      specialty: v.specialty,
      message: v.message,
      consentAt: now,
      createdAt: now,
      status: "new",
      clientToken: data.token,
      ipHash,
    })
    .onConflictDoNothing({ target: ri.clientToken })
    .returning({ id: ri.id });
  // Две заявки с един ключ едновременно: втората не пише и не праща известие.
  if (inserted.length === 0) return { ok: true };

  const position = listing.category
    ? listingPosition(listing.category.slug, listing.services.map((s) => s.groupTitle))
    : "специалист";
  // Известието тръгва след отговора към госта: бавен Telegram не го задържа (и има свой таймаут).
  after(() => notifyAndLog({ id, position, name: v.name, phone: v.phone, message: v.message }));
  revalidatePath("/admin/positions");
  return { ok: true };
}

async function notifyAndLog(i: Parameters<typeof notifyRentalInquiry>[0]) {
  const log = await notifyRentalInquiry(i);
  try {
    await db.update(ri).set({ notifyLog: { ...log } }).where(eq(ri.id, i.id));
  } catch (e) {
    // Записът вече е направен; губи се само дневникът на известието, затова грешката отива в лога.
    console.error("[rental-inquiry] %s: notify_log не се записа:", i.id, e instanceof Error ? e.message : String(e));
  }
}

/* ── Само за администратор (раздел «Запитвания» в «Места под наем») ── */

export interface AdminInquiry {
  id: string;
  positionId: string;
  positionTitle: string;
  name: string;
  phone: string;
  specialty: string | null;
  message: string | null;
  consentAt: Date;
  createdAt: Date;
  status: "new" | "handled";
  handledAt: Date | null;
  /** Грешката на известието (Telegram), ако е имало; null = тръгнало. */
  notifyError: string | null;
  notifyTargets: number | null;
  /** false = известието не стигна до нито един получател; null = дневникът липсва. */
  notifyDelivered: boolean | null;
}

/** Запитванията, най-новите първи; по желание само за едно място и/или едно състояние. */
export async function listRentalInquiries(filter?: {
  positionId?: string;
  status?: "new" | "handled";
}): Promise<AdminInquiry[]> {
  await requireAdmin();
  const conds = [];
  if (filter?.positionId) conds.push(eq(ri.positionId, filter.positionId));
  if (filter?.status) conds.push(eq(ri.status, filter.status));
  const rows = await db
    .select({
      id: ri.id,
      positionId: ri.positionId,
      positionTitle: schema.rentalPositions.title,
      name: ri.name,
      phone: ri.phone,
      specialty: ri.specialty,
      message: ri.message,
      consentAt: ri.consentAt,
      createdAt: ri.createdAt,
      status: ri.status,
      handledAt: ri.handledAt,
      notifyLog: ri.notifyLog,
    })
    .from(ri)
    .innerJoin(schema.rentalPositions, eq(ri.positionId, schema.rentalPositions.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(ri.createdAt))
    .limit(500);
  return rows.map(({ notifyLog, ...r }) => {
    const log = notifyLog as { error?: string; targets?: number; telegram?: { ok: boolean }[] } | null;
    return {
      ...r,
      notifyError: log?.error ?? null,
      notifyTargets: log?.targets ?? null,
      notifyDelivered: log ? (log.telegram ?? []).some((t) => t.ok) : null,
    };
  });
}

const idSchema = z.string().min(1).max(64);

/** «Отбележи като обработено». */
export async function markInquiryHandled(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Запитването не е намерено." };
  const done = await db
    .update(ri)
    .set({ status: "handled", handledAt: new Date() })
    .where(eq(ri.id, id))
    .returning({ id: ri.id });
  if (done.length === 0) return { ok: false, error: "Запитването не е намерено." };
  revalidatePath("/admin/positions");
  return { ok: true };
}

/** «Изтрий» (личните данни се махат веднага). */
export async function deleteInquiry(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Запитването не е намерено." };
  const gone = await db.delete(ri).where(eq(ri.id, id)).returning({ id: ri.id });
  if (gone.length === 0) return { ok: false, error: "Запитването не е намерено." };
  revalidatePath("/admin/positions");
  return { ok: true };
}
