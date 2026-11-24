"use server";

import { requireAdmin, requireStaff } from "@/lib/actions/auth-guard";
import {
  approveCampaignCore,
  checkDraftCore,
  returnCampaignCore,
  stopCampaignCore,
  submitCampaignCore,
} from "@/lib/campaigns/core";
import type { CampaignInput, ReturnReasonKey, StopReasonKey } from "@/lib/campaigns/rules";

// Промоциите (№11, част 1). Всяка проверка по закона е на сървъра (core.ts → rules.ts); браузърът само показва.

/** Стъпките във формата: проверката и фактите (предишната цена от дневника) без запис. */
export async function checkCampaignDraft(input: CampaignInput, campaignId?: string) {
  const { resource } = await requireStaff();
  return checkDraftCore(resource, input, campaignId);
}

/** «Изпрати за одобрение» (или «Пусни промоцията» за Снежана). С campaignId: върната и поправена. */
export async function submitCampaign(input: CampaignInput, campaignId?: string) {
  const { session, resource } = await requireStaff();
  return submitCampaignCore(resource, session.user.id, input, campaignId);
}

export async function stopMyCampaign(id: string, reason: StopReasonKey, note: string | null) {
  const { session, resource } = await requireStaff();
  return stopCampaignCore(id, { kind: "staff", resourceId: resource.id, userId: session.user.id }, reason, note);
}

export async function approveCampaign(id: string) {
  const session = await requireAdmin();
  return approveCampaignCore(id, session.user.id);
}

export async function returnCampaign(id: string, reason: ReturnReasonKey, note: string | null) {
  await requireAdmin();
  return returnCampaignCore(id, reason, note);
}

export async function stopCampaignAsAdmin(id: string, reason: StopReasonKey, note: string | null) {
  const session = await requireAdmin();
  return stopCampaignCore(id, { kind: "admin", userId: session.user.id }, reason, note);
}
