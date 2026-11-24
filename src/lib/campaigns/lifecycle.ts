import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { resolveOffering } from "@/lib/booking/offering";
import { isEnded } from "@/lib/booking/ended";
import { notifyResource } from "@/lib/notify";
import { sendTelegramToAdmin } from "@/lib/telegram";
import type { FacebookPostOptions } from "@/lib/facebook/page-post";
import { addDays, diffDays, shortDay } from "@/lib/campaigns/rules";
import { loadCampaignViews, revalidateCampaigns, serviceTitle, todaySofia, type CampaignView } from "@/lib/campaigns/core";
import { claimCampaignKey, deleteResourcePosts, postWeeklyCarousel, publishStartPost, siteBase } from "@/lib/campaigns/facebook";

// Кронът на промоциите (№11, част 4) в 00:00 Europe/Sofia: опреснява страниците (предстои → тече → свършила
// се смятат по дата, кронът само сменя кеша), спира от системата, пуска поста в деня на началото и праща
// известията 6.6, 6.8, 6.9 и «7 дни без час». Всяко известие е веднъж (campaigns.notified).

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export type SystemStopReason = "system_hidden" | "system_paused" | "system_ended";

/** Спиране от системата (без бутон): статусът «спряна» с причина; часовете пазят цената си. */
async function systemStop(id: string, reason: SystemStopReason): Promise<{ resourceId: string } | null> {
  const now = new Date();
  const u = await db
    .update(schema.campaigns)
    .set({ status: "stopped", stopReason: reason, stopNote: null, stoppedAt: now, stoppedBy: "system", updatedAt: now })
    .where(and(eq(schema.campaigns.id, id), inArray(schema.campaigns.status, ["pending", "approved"])))
    .returning({ resourceId: schema.campaigns.resourceId });
  return u[0] ?? null;
}

/** Защо системата спира промоцията днес, или null (специалистът приключил или скрит, услугата без онлайн запис). */
async function stopReasonFor(c: { resourceId: string; id: string }): Promise<SystemStopReason | null> {
  const r = await db.query.resources.findFirst({ where: (x, { eq: e }) => e(x.id, c.resourceId) });
  if (!r || isEnded(r)) return "system_ended";
  if (!r.active) return "system_paused";
  const svc = await db.query.campaignServices.findMany({ where: (s, { eq: e }) => e(s.campaignId, c.id) });
  for (const s of svc) {
    const o = await resolveOffering(c.resourceId, s.serviceItemId);
    if (!o.catalogVisible || !o.offered || !o.onlineBookable) return "system_hidden";
  }
  return null;
}

/**
 * «Приключи сътрудничеството» (решение 24): промоциите му спират веднага, специалистът получава 6.13 (преди да
 * му се махне Telegram), постовете му се трият от страницата.
 */
export async function endResourceCampaigns(resourceId: string, fb: FacebookPostOptions = {}) {
  const today = todaySofia();
  const open = await db.query.campaigns.findMany({
    where: (c, { and: a, eq: e, inArray: inA, gte: g }) => a(e(c.resourceId, resourceId), inA(c.status, ["pending", "approved"]), g(c.endsOn, today)),
    columns: { id: true },
  });
  let stopped = 0;
  for (const c of open) if (await systemStop(c.id, "system_ended")) stopped++;
  if (stopped) {
    revalidateCampaigns();
    await notifyResource(resourceId, {
      title: "Промоциите са спрени",
      body: "Сътрудничеството приключи, затова промоциите са спрени. Записаните часове пазят цената си.",
    }).catch(() => null);
  }
  const posts = await deleteResourcePosts(resourceId, fb);
  return { stopped, ...posts };
}

/** Нови клиенти по промоцията: часове, преди които клиентът (имейл, телефон) няма друг час при специалиста. */
async function newClients(campaignId: string): Promise<number> {
  const rows = await db.execute(sql`
    select count(*)::int as n
    from bookings b join clients c on c.id = b.client_id
    where b.campaign_id = ${campaignId} and b.status <> 'cancelled'
      and not exists (
        select 1 from bookings b2 join clients c2 on c2.id = b2.client_id
        where b2.resource_id = b.resource_id and b2.status <> 'cancelled' and b2.start_at < b.start_at and b2.id <> b.id
          and (c2.id = c.id
            or (c.email is not null and lower(c2.email) = lower(c.email))
            or (length(regexp_replace(coalesce(c.phone, ''), '[^0-9]', '', 'g')) >= 6
              and right(regexp_replace(coalesce(c2.phone, ''), '[^0-9]', '', 'g'), 9) = right(regexp_replace(coalesce(c.phone, ''), '[^0-9]', '', 'g'), 9)))
      )`);
  const list = (Array.isArray(rows) ? rows : (rows as { rows?: unknown[] }).rows ?? []) as { n: number }[];
  return Number(list[0]?.n ?? 0);
}

const titleOf = (v: CampaignView) => v.services.map((s) => s.name).join(", ");

/** До специалиста; до Снежана също, ако промоцията не е нейна (тя е и специалистът). */
async function tellBoth(v: CampaignView, title: string, body: string, adminBody: string) {
  await notifyResource(v.resourceId, { title, body, url: `/staff/promotions?id=${v.id}` }).catch(() => null);
  if (!v.isOwner) {
    await sendTelegramToAdmin(esc(adminBody), {
      inline_keyboard: [[{ text: "Промоции", url: `${siteBase()}/admin/promotions` }]],
    }).catch(() => false);
  }
}

export interface CronSummary {
  today: string;
  stopped: number;
  posts: { posted: number; failed: number };
  slotsOut: number;
  twoDays: number;
  ended: number;
  quiet: number;
}

/** Нощният ход. `fb` е само за пробите (подменена Meta). */
export async function runCampaignCron(fb: FacebookPostOptions = {}): Promise<CronSummary> {
  const today = todaySofia();
  const out: CronSummary = { today, stopped: 0, posts: { posted: 0, failed: 0 }, slotsOut: 0, twoDays: 0, ended: 0, quiet: 0 };

  // 1. Спиране от системата: отворените (чакат или одобрени, краят не е минал).
  const open = await db.query.campaigns.findMany({
    where: and(inArray(schema.campaigns.status, ["pending", "approved"]), gte(schema.campaigns.endsOn, today)),
    columns: { id: true, resourceId: true },
  });
  for (const c of open) {
    const reason = await stopReasonFor(c);
    if (!reason || !(await systemStop(c.id, reason))) continue;
    out.stopped++;
    const title = await serviceTitle(c.id);
    const body =
      reason === "system_hidden"
        ? `Промоцията „${title}“ е спряна: услугата вече не е в онлайн записването. Записаните часове пазят цената си.`
        : reason === "system_paused"
          ? `Промоцията „${title}“ е спряна: профилът ти е скрит от сайта. Записаните часове пазят цената си.`
          : "Сътрудничеството приключи, затова промоциите са спрени. Записаните часове пазят цената си.";
    await notifyResource(c.resourceId, { title: "Промоцията е спряна", body, url: `/staff/promotions?id=${c.id}` }).catch(() => null);
  }

  // 2–6. Одобрените: постът при старта и известията.
  const rows = await db.query.campaigns.findMany({
    where: (c, { eq: e }) => e(c.status, "approved"),
    columns: { id: true, facebookPostId: true, notified: true },
  });
  const views = new Map((await loadCampaignViews({})).map((v) => [v.id, v]));
  for (const row of rows) {
    const v = views.get(row.id);
    if (!v) continue;
    const title = titleOf(v);
    const booked = v.stats.total;
    const full = v.slots != null && booked >= v.slots;

    if (v.phase === "running") {
      if (!row.facebookPostId && !row.notified?.fb_start) {
        const r = await publishStartPost(v.id, fb);
        if (r === "posted") out.posts.posted++;
        if (r === "failed") out.posts.failed++;
      }
      // 6.6: местата свършиха (картата вече не се показва: сайтът брои живо).
      if (full && (await claimCampaignKey(v.id, "slots_out"))) {
        out.slotsOut++;
        await notifyResource(v.resourceId, {
          title: "Местата свършиха",
          body: `Местата по „${title}“ свършиха. Промоцията се скри от сайта. Записани часове: ${booked}.`,
          url: `/staff/promotions?id=${v.id}`,
        }).catch(() => null);
      }
      // 6.8: 2 дни преди края (и само ако промоцията е по-дълга от тези 2 дни).
      const left = diffDays(today, v.endsOn);
      if (!full && left >= 0 && left <= 2 && diffDays(v.startsOn, v.endsOn) > 2 && (await claimCampaignKey(v.id, "two_days"))) {
        out.twoDays++;
        await notifyResource(v.resourceId, {
          title: "Промоцията свършва",
          body: `Промоцията „${title}“ свършва на ${shortDay(v.endsOn, today)}. Записани часове: ${booked}. Краят не се мести.`,
          url: `/staff/promotions?id=${v.id}`,
        }).catch(() => null);
      }
      // Слабите се спират, добрите остават (само органично, решение 33): 7 дни без нито един записан час.
      if (booked === 0 && today >= addDays(v.startsOn, 7) && (await claimCampaignKey(v.id, "quiet_7d"))) {
        out.quiet++;
        await tellBoth(
          v,
          "Промоция без записан час",
          `Промоцията „${title}“ тече от 7 дни без нито един записан час. Ако не върви, спри я и пусни друга с друга цена или услуга.`,
          `Промоцията „${title}“ на ${v.resourceName} тече от 7 дни без нито един записан час. Можеш да я спреш или да предложиш друга.`,
        );
      }
    }

    // 6.9: свърши (до 7 дни след края, за да не излязат стари при първото пускане).
    if (v.phase === "ended" && diffDays(v.endsOn, today) <= 7 && (await claimCampaignKey(v.id, "ended"))) {
      out.ended++;
      const s = v.stats;
      const fresh = await newClients(v.id);
      const line = `свърши. Записани часове: ${s.total}, дошли: ${s.came}, отказани: ${s.cancelled}, неявили се: ${s.noShow}.\nНови клиенти: ${fresh}.`;
      await tellBoth(v, "Промоцията свърши", `Промоцията „${title}“ ${line}`, `Промоцията „${title}“ на ${v.resourceName} ${line}`);
    }
  }

  // Предстои → тече → свършила: страниците четат по дата, тук само се опресняват.
  revalidateCampaigns();
  return out;
}

/** Понеделник сутрин: каруселът. */
export async function runCarouselCron(fb: FacebookPostOptions = {}) {
  return postWeeklyCarousel(todaySofia(), fb);
}
