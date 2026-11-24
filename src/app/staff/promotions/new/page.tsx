import type { Metadata } from "next";
import { requireStaff } from "@/lib/actions/auth-guard";
import { checkDraftCore, whoFor } from "@/lib/campaigns/core";
import type { CampaignInput } from "@/lib/campaigns/rules";
import { db } from "@/lib/db";
import { StaffShell } from "@/components/staff/staff-shell";
import { CampaignForm } from "@/components/campaigns/campaign-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Нова промоция | Euphoria",
  robots: { index: false, follow: false },
};

/** Формата на 5 стъпки (№11, кадри A-форма-390, приложение-промоции-390, приложение-кампания-390). ?edit=<id>: върната. */
export default async function NewPromotionPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { resource } = await requireStaff();
  const { edit } = await searchParams;

  let initial: CampaignInput | null = null;
  if (edit) {
    const c = await db.query.campaigns.findFirst({ where: (x, { eq }) => eq(x.id, edit) });
    if (c && c.resourceId === resource.id && c.status === "returned") {
      const svc = await db.query.campaignServices.findMany({ where: (s, { eq }) => eq(s.campaignId, c.id) });
      initial = {
        kind: c.kind,
        serviceItemIds: svc.map((s) => s.serviceItemId),
        newPrices: Object.fromEntries(svc.map((s) => [s.serviceItemId, s.newPriceEur])),
        gift: c.gift,
        reason: c.reason,
        startsOn: c.startsOn,
        endsOn: c.endsOn,
        slots: c.slots,
        firstVisitOnly: c.firstVisitOnly,
      };
    }
  }

  const empty: CampaignInput = {
    kind: "discount",
    serviceItemIds: [],
    newPrices: {},
    gift: null,
    reason: null,
    startsOn: "",
    endsOn: "",
    slots: null,
    firstVisitOnly: false,
  };
  const [who, draft] = await Promise.all([whoFor(resource), checkDraftCore(resource, empty)]);
  const services = draft.services.filter((s) => s.offered);

  return (
    <StaffShell kind={resource.kind}>
      <CampaignForm
        services={services}
        today={draft.today}
        who={who.label}
        isOwner={who.isOwner}
        showConsentLine={!who.isOwner && !who.hasConsent}
        initial={initial ?? empty}
        editId={initial ? edit : undefined}
      />
    </StaffShell>
  );
}
