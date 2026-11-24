import { and, arrayOverlaps, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, schema } from "@/lib/db";
import { formatEuro } from "@/lib/booking/price";
import { sofiaWeekday } from "@/lib/booking/time";
import { notifyResource } from "@/lib/notify";
import { sendTelegramPhotoToAdmin, sendTelegramToAdmin } from "@/lib/telegram";
import { siteConfig } from "@/lib/site";
import {
  deleteFacebookPost,
  postCarouselToFacebookPage,
  postPhotoToFacebookPage,
  type FacebookPostOptions,
} from "@/lib/facebook/page-post";
import { loadCampaignViews, todaySofia, type CampaignView } from "@/lib/campaigns/core";
import { loadRunningCampaigns } from "@/lib/campaigns/public";
import { longDay } from "@/lib/campaigns/rules";

// Facebook за промоциите (№11, част 4; решения 23 и 24, 33 «не»: само органично, без платена реклама).
// Постът излиза в деня на началото (кронът в 00:00, или веднага при одобрение на вече почнала промоция), с
// картината 4:5 от /api/og/promo/{id} и текста на Саиф (точка 7). Седмичният карусел е в понеделник сутрин.
// При «Приключи сътрудничеството» постовете на специалиста се трият. Отказ от Meta не спира промоцията на
// сайта: Снежана получава в Telegram текста и бутона «Сподели» или връзките за ръчно триене.
// Не е "use server": вика се от крона и от сърцевината след проверка за вход.

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export const siteBase = () => (process.env.NEXT_PUBLIC_SITE_URL ?? siteConfig.url).replace(/\/$/, "");

/** Името на услугата за поста и картината: над 40 знака се реже преди « (» или по дума (Саиф, «Чака отговор» т. 6). */
export function shortServiceName(name: string, max = 40): string {
  const t = name.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const paren = t.indexOf(" (");
  if (paren > 0 && paren <= max) return t.slice(0, paren);
  const words = t.split(" ");
  let out = "";
  for (const w of words) {
    const next = out ? `${out} ${w}` : w;
    if (next.length > max) break;
    out = next;
  }
  return (out || t.slice(0, max)).replace(/[\s,;:(+\-–]+$/, "");
}

/** Връзката от поста и от картата в карусела: /promotsii към картата на промоцията, с мястото (част 4, 5б). */
export const promoLink = (id: string, from: "facebook" | "karusel") =>
  `${siteBase()}/promotsii?id=${encodeURIComponent(id)}&from=${from}#promo-${encodeURIComponent(id)}`;
export const promoImageUrl = (id: string, square = false) =>
  `${siteBase()}/api/og/promo/${encodeURIComponent(id)}${square ? "?f=sq" : ""}`;

const sameWho = (v: CampaignView) => (v.isOwner ? v.who.replace(/^при /, "") : "този специалист");

function servicePrice(v: CampaignView, s: CampaignView["services"][number]): string {
  if (v.kind === "discount" && s.newEur != null && s.prevEur != null) {
    return `нова цена ${formatEuro(s.newEur)}, предишна цена ${formatEuro(s.prevEur)} (−${s.percent}%)`;
  }
  return s.regularEur != null ? `цена ${s.priceFrom ? "от " : ""}${formatEuro(s.regularEur)}` : "";
}

function conditions(v: CampaignView, today: string): string {
  const parts: string[] = [];
  if (v.firstVisitOnly) parts.push(`Само за първо посещение при ${sameWho(v)}.`);
  if (v.slots) parts.push(v.slots === 1 ? "Общо 1 място." : `Общо ${v.slots} места.`);
  parts.push(`Важи до ${longDay(v.endsOn, today)} включително.`);
  return parts.join(" ");
}

/** Текстът на поста по двата шаблона на Саиф (точка 7). Няколко услуги: всяка със своите цени. */
export function postText(v: CampaignView, today: string, link: string): string {
  const gift = v.kind === "gift" && v.gift ? ` Подарък в същия час: ${v.gift}.` : "";
  let head: string;
  if (v.services.length === 1) {
    const s = v.services[0];
    head = `В Euphoria, кв. Левски, Варна: ${shortServiceName(s.name)} ${v.who}, ${servicePrice(v, s)}.${gift}`;
  } else {
    const list = v.services.map((s) => `${shortServiceName(s.name)}: ${servicePrice(v, s)}.`).join(" ");
    head = `В Euphoria, кв. Левски, Варна: промоция ${v.who}. ${list}${gift}`;
  }
  return `${head} ${conditions(v, today)}\n\nЗапиши час: ${link}`;
}

/** Описанието под картата в карусела (цената е тук, не в картината). */
export function carouselDescription(v: CampaignView, today: string): string {
  const s = v.services[0];
  const price = s ? servicePrice(v, s) : "";
  const gift = v.kind === "gift" && v.gift ? `, подарък в същия час: ${v.gift}` : "";
  const first = v.firstVisitOnly ? " Само за първо посещение." : "";
  return `${v.who.replace(/^при /, "При ")}: ${price}${gift}. До ${longDay(v.endsOn, today)}.${first}`;
}

export async function loadCampaignView(id: string): Promise<CampaignView | null> {
  const c = await db.query.campaigns.findFirst({ where: (x, { eq: e }) => e(x.id, id), columns: { resourceId: true } });
  if (!c) return null;
  return (await loadCampaignViews({ resourceId: c.resourceId })).find((v) => v.id === id) ?? null;
}

/** Отбелязва ключа в campaigns.notified; true само за първия (два крона или крон и одобрение не правят двойно). */
export async function claimCampaignKey(id: string, key: string): Promise<boolean> {
  const rows = await db
    .update(schema.campaigns)
    .set({ notified: sql`${schema.campaigns.notified} || jsonb_build_object(${key}::text, now()::text)` })
    .where(and(eq(schema.campaigns.id, id), sql`not (${schema.campaigns.notified} ? ${key})`))
    .returning({ id: schema.campaigns.id });
  return rows.length > 0;
}

const shareUrl = (link: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`;
const titleOf = (v: CampaignView) => v.services.map((s) => s.name).join(", ");

export type StartPostResult = "posted" | "failed" | "skipped";

/**
 * Постът при старта (решение 23): само одобрена промоция, която тече днес, и само веднъж. Пази id на поста.
 * Отказ (или няма ключ): Снежана получава в Telegram картината, текста и «Сподели» (Саиф 6.5).
 */
export async function publishStartPost(id: string, fb: FacebookPostOptions = {}): Promise<StartPostResult> {
  const v = await loadCampaignView(id);
  if (!v || v.status !== "approved" || v.phase !== "running") return "skipped";
  const row = await db.query.campaigns.findFirst({ where: (x, { eq: e }) => e(x.id, id), columns: { facebookPostId: true } });
  if (row?.facebookPostId) return "skipped";
  if (!(await claimCampaignKey(id, "fb_start"))) return "skipped";

  const today = todaySofia();
  const link = promoLink(id, "facebook");
  const text = postText(v, today, link);
  const image = promoImageUrl(id);
  const r = await postPhotoToFacebookPage({ caption: text, imageUrl: image }, fb);
  const title = titleOf(v);
  if (r.status === "posted") {
    await db
      .update(schema.campaigns)
      .set({ facebookPostId: r.postId, facebookPostedAt: new Date() })
      .where(eq(schema.campaigns.id, id));
    await notifyResource(v.resourceId, {
      title: "Промоцията тръгна",
      body: `Промоцията „${title}“ тръгна. Постът във Facebook: ${r.postUrl}`,
      url: `/staff/promotions?id=${id}`,
    }).catch(() => null);
    return "posted";
  }
  console.error("[campaigns] постът във Facebook не излезе:", id, r.status, "reason" in r ? r.reason : "");
  const head = `Facebook не публикува поста за „${title}“ на ${v.isOwner ? "Снежана" : v.resourceName}. Текстът е долу, можеш да го споделиш сама. Промоцията на сайта работи.`;
  await sendTelegramPhotoToAdmin(image, `${esc(head)}\n\n${esc(text)}`, {
    inline_keyboard: [[{ text: "Сподели", url: shareUrl(link) }]],
  }).catch(() => null);
  return "failed";
}

export type CarouselResult = "posted" | "failed" | "not_monday" | "too_few" | "exists";

/**
 * Седмичният карусел (решено от Орион): в понеделник, ако текат поне 2 промоции (със свободни места), един пост
 * с карта на промоция; всяка карта води към своята промоция. Един на седмица (UNIQUE week_of). Без цена в
 * картините: цената е в описанието под картата.
 */
export async function postWeeklyCarousel(today: string, fb: FacebookPostOptions = {}): Promise<CarouselResult> {
  if (sofiaWeekday(today) !== 1) return "not_monday";
  const running = await loadRunningCampaigns();
  if (running.length < 2) return "too_few";
  const picked = running.slice(0, 5);
  const ids = picked.map((c) => c.id);
  const id = nanoid();
  const inserted = await db
    .insert(schema.campaignCarousels)
    .values({ id, weekOf: today, campaignIds: ids })
    .onConflictDoNothing()
    .returning({ id: schema.campaignCarousels.id });
  if (inserted.length === 0) return "exists";

  const views = new Map((await loadCampaignViews({})).map((v) => [v.id, v]));
  const cards = picked.flatMap((c) => {
    const v = views.get(c.id);
    if (!v) return [];
    const first = v.services[0];
    return [
      {
        link: promoLink(c.id, "karusel"),
        picture: promoImageUrl(c.id, true),
        name: first ? shortServiceName(first.name) : "Промоция",
        description: carouselDescription(v, today),
      },
    ];
  });
  const r = await postCarouselToFacebookPage(
    {
      message: "Промоциите в Euphoria тази седмица, кв. Левски, Варна. Всяка карта води към своята промоция: цена, условия и запис.",
      link: `${siteBase()}/promotsii?from=karusel`,
      cards,
    },
    fb,
  );
  if (r.status === "posted") {
    await db
      .update(schema.campaignCarousels)
      .set({ status: "posted", facebookPostId: r.postId })
      .where(eq(schema.campaignCarousels.id, id));
    return "posted";
  }
  await db.update(schema.campaignCarousels).set({ status: "failed" }).where(eq(schema.campaignCarousels.id, id));
  console.error("[campaigns] каруселът не излезе:", r.status, "reason" in r ? r.reason : "");
  const link = `${siteBase()}/promotsii?from=facebook`;
  await sendTelegramToAdmin(
    esc(`Facebook не публикува седмичния пост с промоциите (текат ${running.length}). Можеш да споделиш страницата с промоциите сама.`),
    { inline_keyboard: [[{ text: "Сподели", url: shareUrl(link) }]] },
  ).catch(() => false);
  return "failed";
}

/**
 * Трие постовете на специалиста (решение 24): постовете при старта на неговите промоции и каруселите, в които е
 * негова промоция. Каквото Meta откаже, отива при Снежана като връзки за ръчно триене.
 */
export async function deleteResourcePosts(
  resourceId: string,
  fb: FacebookPostOptions = {},
): Promise<{ deleted: number; failed: string[] }> {
  const own = await db.query.campaigns.findMany({
    where: (c, { eq: e }) => e(c.resourceId, resourceId),
    columns: { id: true, facebookPostId: true, facebookDeletedAt: true },
  });
  if (own.length === 0) return { deleted: 0, failed: [] };
  const carousels = await db
    .select()
    .from(schema.campaignCarousels)
    .where(
      and(
        arrayOverlaps(schema.campaignCarousels.campaignIds, own.map((c) => c.id)),
        isNotNull(schema.campaignCarousels.facebookPostId),
        isNull(schema.campaignCarousels.deletedAt),
      ),
    );
  let deleted = 0;
  const failed: string[] = [];
  for (const c of own) {
    if (!c.facebookPostId || c.facebookDeletedAt) continue;
    const r = await deleteFacebookPost(c.facebookPostId, fb);
    if (r.status === "deleted") {
      deleted++;
      await db.update(schema.campaigns).set({ facebookDeletedAt: new Date() }).where(eq(schema.campaigns.id, c.id));
    } else failed.push(`https://www.facebook.com/${c.facebookPostId}`);
  }
  for (const k of carousels) {
    const r = await deleteFacebookPost(k.facebookPostId!, fb);
    if (r.status === "deleted") {
      deleted++;
      await db
        .update(schema.campaignCarousels)
        .set({ status: "deleted", deletedAt: new Date() })
        .where(eq(schema.campaignCarousels.id, k.id));
    } else {
      failed.push(`https://www.facebook.com/${k.facebookPostId}`);
      await db.update(schema.campaignCarousels).set({ status: "delete_failed" }).where(eq(schema.campaignCarousels.id, k.id));
    }
  }
  if (failed.length) {
    const res = await db.query.resources.findFirst({ where: (r, { eq: e }) => e(r.id, resourceId), columns: { name: true } });
    const n = failed.length;
    const head = `Сътрудничеството с ${res?.name ?? "специалиста"} приключи. Facebook не изтри ${n === 1 ? "1 пост" : `${n} поста`} с промоциите. Изтрий ги ръчно:`;
    await sendTelegramToAdmin([esc(head), ...failed.map(esc)].join("\n")).catch(() => false);
  }
  return { deleted, failed };
}
