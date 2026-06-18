"use server";

import { setSetting } from "@/lib/actions/settings";
import { requireAdmin } from "@/lib/actions/auth-guard";
import { getClosedDates, CLOSURES_KEY } from "@/lib/booking/closures";

/** Добавя затворен ден (YYYY-MM-DD). setSetting вече изисква admin + revalidate-ва. */
export async function addClosedDate(date: string) {
  await requireAdmin();
  const dates = await getClosedDates();
  if (!dates.includes(date)) dates.push(date);
  dates.sort();
  await setSetting(CLOSURES_KEY, dates);
  return { ok: true as const, dates };
}

/** Премахва затворен ден. */
export async function removeClosedDate(date: string) {
  await requireAdmin();
  const dates = (await getClosedDates()).filter((d) => d !== date);
  await setSetting(CLOSURES_KEY, dates);
  return { ok: true as const, dates };
}
