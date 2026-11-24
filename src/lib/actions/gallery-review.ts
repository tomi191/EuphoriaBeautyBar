"use server";

import { requireAdmin } from "@/lib/actions/auth-guard";
import { approveImageCore, rejectImageCore, removeImageFromSiteCore, saveAltCore } from "@/lib/gallery/review";

// Действията на Снежана в администрацията (№8 В1а и В3). Сърцевината е в lib/gallery/review.ts,
// за да я ползват и бутоните в Telegram (там проверката е «чатът е админ каналът», не сесия).

/**
 * Одобрява снимка от специалист (само администратор): слага знака върху копие на оригинала,
 * записва публичния файл, пази оригинала, записва описанието (alt), сменя състоянието на
 * «одобрена» и опреснява галерията. alt: поправеното от Снежана (до 125 знака); празно → запазеното
 * или сглобеното. category: по желание, иначе остава смятаната от услугата.
 */
export async function approveGalleryImage(imageId: string, opts: { alt?: string | null; category?: string } = {}) {
  const session = await requireAdmin();
  return approveImageCore(imageId, opts, session.user.id);
}

/** Връща чакаща снимка на специалиста с причина (до 80 знака). Остава само при него, оригиналът се пази. */
export async function rejectGalleryImage(imageId: string, reason: string) {
  await requireAdmin();
  return rejectImageCore(imageId, reason);
}

/**
 * Маха одобрена снимка от специалист от сайта: публичният файл със знака се трие, снимката става
 * «върната» с причината (специалистът я вижда), оригиналът остава. Старите снимки (без оригинал)
 * се махат с «Изтрий» (deleteGalleryImage), защото тях няма откъде да ги върнем.
 */
export async function removeGalleryImageFromSite(imageId: string, reason?: string) {
  await requireAdmin();
  return removeImageFromSiteCore(imageId, reason);
}

/** Поправка на описанието (молива): на чакаща се пази за одобрението, на одобрена се сменя на сайта. */
export async function saveGalleryAlt(imageId: string, alt: string) {
  await requireAdmin();
  return saveAltCore(imageId, alt);
}
