import { revalidatePath } from "next/cache";
import { and, eq, inArray, isNotNull, ne, sql } from "drizzle-orm";
import sharp from "sharp";
import { db, schema } from "@/lib/db";
import { buildGalleryAlt, ALT_MAX } from "@/lib/gallery/alt";
import { applyWatermark } from "@/lib/gallery/watermark";
import { galleryThumbSrc } from "@/lib/gallery/thumb";
import { makeGalleryThumb } from "@/lib/gallery/thumb-image";
import { REJECT_REASON_MAX } from "@/lib/gallery/upload-rules";
import { galleryCategories } from "@/lib/data/gallery";
import {
  GALLERY_BUCKET,
  ORIGINALS_BUCKET,
  galleryStorage,
  publicGalleryPath,
  publicGalleryUrl,
  signOriginals,
} from "@/lib/gallery/storage";
import {
  REJECT_REASONS,
  REVIEW_TEXT,
  parseGalleryCallback,
  uploadedWhenTg,
} from "@/lib/gallery/review-text";
import {
  answerCallback,
  editMessageCaption,
  editMessageText,
  getAdminChatId,
  sendTelegramPhotoToAdmin,
  type InlineKeyboard,
} from "@/lib/telegram";
import { siteConfig } from "@/lib/site";

// Сърцевината на одобрението (№8 В3). Без проверка за вход: викат я действията в
// lib/actions/gallery-review.ts (след requireAdmin) и бутоните в Telegram (след проверка, че
// чатът е админ каналът). Не е "use server", затова нищо оттук не е достъпно от браузъра.

type Fail = { ok: false; error: string };
const fail = (error: string): Fail => ({ ok: false, error });
const VALID_CATEGORIES = new Set(galleryCategories.filter((c) => c.value !== "all").map((c) => c.value as string));
/** Най-дългата страна на публичния файл (като при качването от администрацията). */
const PUBLIC_MAX_SIDE = 1600;

type ImageRow = typeof schema.galleryImages.$inferSelect;

function revalidateGallery() {
  revalidatePath("/admin/gallery");
  revalidatePath("/galeriya");
  revalidatePath("/");
  revalidatePath("/zapazi-chas");
}

/** Описанието, което ще излезе: запазеното от Снежана или сглобеното от услугата, думите и датата. */
async function altFor(img: ImageRow, category?: string): Promise<string> {
  if (img.alt.trim()) return img.alt.trim();
  const [svc, booking, taken] = await Promise.all([
    img.serviceItemId
      ? db.query.serviceItems.findFirst({ where: (s, { eq: e }) => e(s.id, img.serviceItemId!), columns: { name: true } })
      : null,
    img.bookingId
      ? db.query.bookings.findFirst({ where: (b, { eq: e }) => e(b.id, img.bookingId!), columns: { startAt: true } })
      : null,
    db
      .select({ alt: schema.galleryImages.alt })
      .from(schema.galleryImages)
      .where(and(eq(schema.galleryImages.status, "approved"), ne(schema.galleryImages.id, img.id))),
  ]);
  const cat = category ?? img.category;
  const serviceName = svc?.name ?? galleryCategories.find((c) => c.value === cat)?.label ?? "Работа от салона";
  return buildGalleryAlt({
    serviceName,
    note: img.staffNote,
    date: booking?.startAt ?? img.createdAt ?? new Date(),
    existingAlts: taken.map((t) => t.alt),
  });
}

export async function approveImageCore(
  imageId: string,
  opts: { alt?: string | null; category?: string },
  approvedBy: string | null,
) {
  const img = await db.query.galleryImages.findFirst({ where: (g, { eq: e }) => e(g.id, imageId) });
  if (!img || !img.originalPath) return fail("Снимката не е намерена.");
  if (img.status === "approved") return fail("Снимката вече е в галерията.");
  if (opts.category !== undefined && !VALID_CATEGORIES.has(opts.category)) return fail("Невалидна категория.");

  const storage = galleryStorage();
  if (!storage) return fail("Качването не е конфигурирано (липсват ключовете за хранилището).");

  const dl = await storage.client.storage.from(ORIGINALS_BUCKET).download(img.originalPath);
  if (dl.error || !dl.data) {
    console.error("[gallery-review] не успях да сваля оригинала:", img.originalPath, dl.error);
    return fail("Оригиналът не се отвори. Опитай пак след малко.");
  }
  const resized = await sharp(Buffer.from(await dl.data.arrayBuffer()))
    .rotate()
    .resize({ width: PUBLIC_MAX_SIDE, height: PUBLIC_MAX_SIDE, fit: "inside", withoutEnlargement: true })
    .toBuffer();
  const marked = await applyWatermark(resized);
  const meta = await sharp(marked.buffer).metadata();

  // Описанието: поправеното при одобрението печели, после запазеното от Снежана, после сглобеното.
  let alt = (opts.alt ?? "").replace(/\s+/g, " ").trim();
  if ([...alt].length > ALT_MAX) return fail(`Описанието е до ${ALT_MAX} знака.`);
  if (!alt) alt = await altFor(img, opts.category);

  // Нов адрес при всяко одобрение: върната и пак одобрена снимка не идва от стария кеш.
  const path = `${img.id}-${Date.now().toString(36)}.webp`;
  const up = await storage.client.storage
    .from(GALLERY_BUCKET)
    .upload(path, marked.buffer, { contentType: "image/webp", upsert: true });
  if (up.error) {
    console.error("[gallery-review] не успях да запиша публичния файл:", up.error);
    return fail("Снимката не излезе. Опитай пак след малко.");
  }
  // Малкото копие за плочката в галерията (визия №32): без него плочката тегли голямата снимка.
  const thumbPath = galleryThumbSrc(path)!;
  const upThumb = await storage.client.storage
    .from(GALLERY_BUCKET)
    .upload(thumbPath, await makeGalleryThumb(marked.buffer), { contentType: "image/webp", upsert: true });
  if (upThumb.error) {
    console.error("[gallery-review] не успях да запиша малкото копие:", upThumb.error);
    await storage.client.storage.from(GALLERY_BUCKET).remove([path]);
    return fail("Снимката не излезе. Опитай пак след малко.");
  }

  const [{ min }] = await db
    .select({ min: sql<number | null>`min(${schema.galleryImages.sortOrder})` })
    .from(schema.galleryImages)
    .where(eq(schema.galleryImages.status, "approved"));
  const updated = await db
    .update(schema.galleryImages)
    .set({
      status: "approved",
      src: publicGalleryUrl(storage, path),
      alt,
      ...(opts.category ? { category: opts.category } : {}),
      width: meta.width ?? img.width,
      height: meta.height ?? img.height,
      sortOrder: (min ?? 0) - 1,
      approvedBy,
      approvedAt: new Date(),
      rejectReason: null,
      rejectedAt: null,
    })
    .where(and(eq(schema.galleryImages.id, img.id), ne(schema.galleryImages.status, "approved")))
    .returning({ id: schema.galleryImages.id });
  if (updated.length === 0) {
    // Друг е одобрил междувременно: махаме излишния файл.
    await storage.client.storage.from(GALLERY_BUCKET).remove([path, thumbPath]);
    return fail("Снимката вече е в галерията.");
  }

  revalidateGallery();
  return { ok: true as const, alt, src: publicGalleryUrl(storage, path) };
}

function cleanReason(reason: string) {
  const r = reason.replace(/\s+/g, " ").trim();
  if (!r) return { error: "Напиши причина или избери готова." };
  if ([...r].length > REJECT_REASON_MAX) return { error: `Причината е до ${REJECT_REASON_MAX} знака.` };
  return { reason: r };
}

export async function rejectImageCore(imageId: string, reason: string) {
  const r = cleanReason(reason);
  if (!r.reason) return fail(r.error!);
  const updated = await db
    .update(schema.galleryImages)
    .set({ status: "rejected", rejectReason: r.reason, rejectedAt: new Date() })
    .where(and(eq(schema.galleryImages.id, imageId), eq(schema.galleryImages.status, "pending")))
    .returning({ id: schema.galleryImages.id });
  if (updated.length === 0) return fail("Снимката не чака одобрение.");
  revalidatePath("/admin/gallery");
  return { ok: true as const };
}

export async function removeImageFromSiteCore(imageId: string, reason?: string) {
  const r = cleanReason(reason?.trim() ? reason : "Махната от сайта.");
  if (!r.reason) return fail(r.error!);

  const img = await db.query.galleryImages.findFirst({ where: (g, { eq: e }) => e(g.id, imageId) });
  if (!img || img.status !== "approved") return fail("Снимката не е в галерията.");
  if (!img.originalPath) return fail("Старата снимка се маха с «Изтрий».");

  const updated = await db
    .update(schema.galleryImages)
    .set({ status: "rejected", src: "", rejectReason: r.reason, rejectedAt: new Date() })
    .where(and(eq(schema.galleryImages.id, img.id), eq(schema.galleryImages.status, "approved")))
    .returning({ id: schema.galleryImages.id });
  if (updated.length === 0) return fail("Снимката не е в галерията.");

  const storage = galleryStorage();
  const path = storage ? publicGalleryPath(storage, img.src) : null;
  if (storage && path) {
    // И малкото копие: свалената снимка не остава публична и в размера за плочката.
    const { error } = await storage.client.storage.from(GALLERY_BUCKET).remove([path, galleryThumbSrc(path) ?? path]);
    if (error) console.error("[gallery-review] не успях да изтрия публичния файл:", path, error);
  }
  revalidateGallery();
  return { ok: true as const };
}

/**
 * Поправка на описанието. Чакаща: пази се и излиза при одобрението (и от Telegram). Одобрена: сменя
 * се на сайта веднага. Празно: чакащата се връща към сглобеното, одобрената остава както е.
 */
export async function saveAltCore(imageId: string, altInput: string) {
  const alt = altInput.replace(/\s+/g, " ").trim();
  if ([...alt].length > ALT_MAX) return fail(`Описанието е до ${ALT_MAX} знака.`);
  const img = await db.query.galleryImages.findFirst({ where: (g, { eq: e }) => e(g.id, imageId) });
  if (!img || !img.uploadedBy) return fail("Снимката не е намерена.");
  if (!alt) {
    if (img.status === "approved") return fail(REVIEW_TEXT.altEmpty);
    await db.update(schema.galleryImages).set({ alt: "" }).where(eq(schema.galleryImages.id, img.id));
    revalidatePath("/admin/gallery");
    return { ok: true as const, alt: await altFor({ ...img, alt: "" }) };
  }
  await db.update(schema.galleryImages).set({ alt }).where(eq(schema.galleryImages.id, img.id));
  if (img.status === "approved") revalidateGallery();
  else revalidatePath("/admin/gallery");
  return { ok: true as const, alt };
}

// ── Четене за екрана на Снежана ──

export type ReviewCard = {
  id: string;
  status: "pending" | "approved" | "rejected";
  previewUrl: string | null;
  alt: string;
  altSaved: boolean;
  hasNote: boolean;
  uploader: string;
  noFace: boolean;
  createdAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectReason: string | null;
};

/** Снимките от специалистите по раздели (най-новите отпред), с адрес за преглед и описанието. */
export async function loadGalleryReview(): Promise<Record<ReviewCard["status"], ReviewCard[]>> {
  const rows = await db.query.galleryImages.findMany({
    where: (g) => isNotNull(g.uploadedBy),
    orderBy: (g, { desc }) => [desc(g.createdAt)],
  });
  const resIds = [...new Set(rows.map((r) => r.uploadedBy!))];
  const resources = resIds.length
    ? await db.query.resources.findMany({ where: (r) => inArray(r.id, resIds), columns: { id: true, name: true } })
    : [];
  const names = new Map(resources.map((r) => [r.id, r.name]));
  const storage = galleryStorage();
  const toSign = rows.filter((r) => r.status !== "approved" && r.originalPath).map((r) => r.originalPath!);
  const signed = storage ? await signOriginals(storage, toSign) : new Map<string, string>();

  const out: Record<ReviewCard["status"], ReviewCard[]> = { pending: [], approved: [], rejected: [] };
  for (const r of rows) {
    out[r.status].push({
      id: r.id,
      status: r.status,
      previewUrl: r.status === "approved" ? r.src || null : (r.originalPath && signed.get(r.originalPath)) || null,
      alt: r.status === "pending" ? await altFor(r) : r.alt.trim() || (await altFor(r)),
      altSaved: !!r.alt.trim(),
      hasNote: !!r.staffNote?.trim(),
      uploader: names.get(r.uploadedBy!) ?? "специалист",
      noFace: !!r.noFaceConfirmedAt,
      createdAt: r.createdAt?.toISOString() ?? null,
      approvedAt: r.approvedAt?.toISOString() ?? null,
      rejectedAt: r.rejectedAt?.toISOString() ?? null,
      rejectReason: r.rejectReason,
    });
  }
  out.approved.sort((a, b) => ((a.approvedAt ?? "") < (b.approvedAt ?? "") ? 1 : -1));
  out.rejected.sort((a, b) => ((a.rejectedAt ?? "") < (b.rejectedAt ?? "") ? 1 : -1));
  return out;
}

/** Чакащите за камбанката в администрацията (последните 7 дни): винаги, вързан или не Telegram. */
export async function pendingPhotoBellItems(since: Date) {
  const rows = await db.query.galleryImages.findMany({
    where: (g, { and: a, eq: e, gte }) => a(e(g.status, "pending"), gte(g.createdAt, since)),
    orderBy: (g, { desc }) => [desc(g.createdAt)],
    limit: 30,
    columns: { id: true, createdAt: true, uploadedBy: true, serviceItemId: true },
  });
  if (rows.length === 0) return [];
  const [resources, services] = await Promise.all([
    db.query.resources.findMany({ columns: { id: true, name: true } }),
    db.query.serviceItems.findMany({
      where: (s) => inArray(s.id, [...new Set(rows.map((r) => r.serviceItemId).filter(Boolean))] as string[]),
      columns: { id: true, name: true },
    }),
  ]);
  const rn = new Map(resources.map((r) => [r.id, r.name]));
  const sn = new Map(services.map((s) => [s.id, s.name]));
  return rows.map((r) => ({
    id: `${r.id}:gallery_pending`,
    kind: "gallery_pending" as const,
    title: REVIEW_TEXT.bellTitle,
    detail: [r.uploadedBy ? rn.get(r.uploadedBy) : null, r.serviceItemId ? sn.get(r.serviceItemId) : null].filter(Boolean).join(" · "),
    at: (r.createdAt ?? new Date()).toISOString(),
    href: "/admin/gallery",
  }));
}

// ── Telegram: известие до Снежана и бутоните ──

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const siteBase = () => process.env.NEXT_PUBLIC_SITE_URL ?? siteConfig.url;

function decisionKeyboard(id: string): InlineKeyboard {
  return {
    inline_keyboard: [
      [
        { text: "Одобри", callback_data: `gal:ok:${id}` },
        { text: "Върни", callback_data: `gal:rj:${id}` },
      ],
      [{ text: "Поправи описанието", url: `${siteBase()}/admin/gallery?edit=${id}` }],
    ],
  };
}

function reasonsKeyboard(id: string): InlineKeyboard {
  return {
    inline_keyboard: [
      ...REJECT_REASONS.map((r, i) => [{ text: r.label, callback_data: `gal:rr:${id}:${i}` }]),
      [{ text: "Друга причина", url: `${siteBase()}/admin/gallery?reject=${id}` }],
      [{ text: "Назад", callback_data: `gal:bk:${id}` }],
    ],
  };
}

/** Подписът: заглавие, описание, кой и кога, лицето (Саиф, 3.1). */
async function caption(img: ImageRow, head: string): Promise<string> {
  const who = img.uploadedBy
    ? (await db.query.resources.findFirst({ where: (r, { eq: e }) => e(r.id, img.uploadedBy!), columns: { name: true } }))?.name
    : null;
  const lines = [`<b>${esc(head)}</b>`, esc(await altFor(img))];
  if (img.createdAt) lines.push(esc(`Качена от ${who ?? "специалист"}, ${uploadedWhenTg(img.createdAt)}`));
  if (img.noFaceConfirmedAt) lines.push(REVIEW_TEXT.noFace);
  if (img.status === "rejected" && img.rejectReason) lines.push(esc(img.rejectReason));
  return lines.join("\n");
}

/**
 * Нова снимка → Снежана: в Telegram със снимката и бутоните, ако админ каналът е свързан.
 * Камбанката в администрацията показва чакащите сама (чете ги от таблицата). Не хвърля.
 */
export async function notifyAdminNewPhoto(imageId: string): Promise<"photo" | "text" | null> {
  try {
    const img = await db.query.galleryImages.findFirst({ where: (g, { eq: e }) => e(g.id, imageId) });
    if (!img || img.status !== "pending") return null;
    const storage = galleryStorage();
    const signed = storage && img.originalPath ? await signOriginals(storage, [img.originalPath]) : new Map<string, string>();
    const photoUrl = (img.originalPath && signed.get(img.originalPath)) || null;
    const sent = await sendTelegramPhotoToAdmin(photoUrl, await caption(img, REVIEW_TEXT.tgNew), decisionKeyboard(img.id));
    if (!sent && (await getAdminChatId())) console.error("[gallery-review] известието до Снежана не тръгна:", imageId);
    return sent;
  } catch (e) {
    console.error("[gallery-review] известието до Снежана падна:", e instanceof Error ? e.message : String(e));
    return null;
  }
}

type TgCallback = { id: string; data?: string; message?: { message_id?: number; chat?: { id?: number | string }; photo?: unknown[] } };

/**
 * Бутоните «Одобри», «Върни», причините и «Назад» под съобщението за нова снимка. Само от админ
 * канала; чужд чат не може да одобри. Връща true, ако данните са за галерията (обработени).
 */
export async function handleGalleryCallback(cb: TgCallback): Promise<boolean> {
  const parsed = parseGalleryCallback(cb.data);
  if (!parsed) return false;
  const chatId = cb.message?.chat?.id;
  const messageId = cb.message?.message_id;
  const adminChat = await getAdminChatId();
  if (chatId === undefined || messageId === undefined || !adminChat || String(chatId) !== adminChat) {
    await answerCallback(cb.id);
    return true;
  }
  const edit = (text: string, kb?: InlineKeyboard) =>
    cb.message?.photo ? editMessageCaption(chatId, messageId, text, kb) : editMessageText(chatId, messageId, text, kb ?? { inline_keyboard: [] });
  const load = () => db.query.galleryImages.findFirst({ where: (g, { eq: e }) => e(g.id, parsed.id) });

  let img = await load();
  if (!img) {
    await answerCallback(cb.id, "Снимката не е намерена.");
    await edit("Снимката вече я няма.");
    return true;
  }
  // Вече решена (от администрацията или с друг бутон): казваме как стои и махаме бутоните.
  if (img.status !== "pending") {
    const head = img.status === "approved" ? REVIEW_TEXT.tgApproved : REVIEW_TEXT.rejected;
    await answerCallback(cb.id, img.status === "approved" ? "Снимката вече е в галерията." : "Снимката не чака одобрение.");
    await edit(await caption(img, head));
    return true;
  }

  switch (parsed.action) {
    case "ok": {
      const r = await approveImageCore(img.id, {}, null);
      img = (await load()) ?? img;
      if (!r.ok) {
        await answerCallback(cb.id, r.error);
        if (img.status !== "pending") await edit(await caption(img, REVIEW_TEXT.tgApproved));
        return true;
      }
      await answerCallback(cb.id, REVIEW_TEXT.approved);
      await edit(await caption(img, REVIEW_TEXT.tgApproved));
      return true;
    }
    case "rj":
      await answerCallback(cb.id);
      await edit(await caption(img, REVIEW_TEXT.tgWhy), reasonsKeyboard(img.id));
      return true;
    case "bk":
      await answerCallback(cb.id);
      await edit(await caption(img, REVIEW_TEXT.tgNew), decisionKeyboard(img.id));
      return true;
    case "rr": {
      const r = await rejectImageCore(img.id, REJECT_REASONS[parsed.reason].text);
      img = (await load()) ?? img;
      await answerCallback(cb.id, r.ok ? REVIEW_TEXT.rejected : r.error);
      if (r.ok) await edit(await caption(img, REVIEW_TEXT.rejected));
      return true;
    }
  }
}
