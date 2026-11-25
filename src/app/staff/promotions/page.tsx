import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireStaff } from "@/lib/actions/auth-guard";
import { loadCampaignViews, todaySofia } from "@/lib/campaigns/core";
import { CAMPAIGN_TEXT, type CampaignPhase } from "@/lib/campaigns/rules";
import { StaffShell } from "@/components/staff/staff-shell";
import { loadStaffDots } from "@/lib/admin/popalni";
import { PromotionPanel, PromotionRow } from "@/components/campaigns/staff-promotions";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Промоции | Euphoria",
  robots: { index: false, follow: false },
};

// Редът в списъка: каквото чака действие горе, историята долу.
const ORDER: CampaignPhase[] = ["pending", "returned", "upcoming", "running", "ended", "stopped", "expired"];

/**
 * «Промоции» (№11, кадри кръг-2/приложение-промоции-390 и приложение-1440). На телефон ?id= отваря промоцията на
 * цял екран; на компютър тя стои в панела до списъка (без ?id= е избрана течащата).
 */
export default async function StaffPromotionsPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { resource } = await requireStaff();
  const { id } = await searchParams;
  const today = todaySofia();
  const views = (await loadCampaignViews({ resourceId: resource.id })).sort(
    (a, b) => ORDER.indexOf(a.phase) - ORDER.indexOf(b.phase),
  );
  const chosen = views.find((v) => v.id === id);
  const selected = chosen ?? views.find((v) => v.phase === "running") ?? views[0];

  const newButton = (
    <Link
      href="/staff/promotions/new"
      className="mb-5 inline-flex h-14 w-full items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
    >
      {CAMPAIGN_TEXT.newButton}
    </Link>
  );

  return (
    <StaffShell dots={await loadStaffDots(resource.id)} kind={resource.kind} split>
      <div className="lg:grid lg:grid-cols-[minmax(0,34rem)_minmax(0,1fr)] lg:items-start lg:gap-8">
        <div className={cn(chosen && "hidden lg:block")}>
          <Link
            href="/staff/profile"
            className="-ml-1 -mt-3 inline-flex h-12 items-center gap-6 px-1 text-[17px] text-foreground transition-colors hover:text-foreground/70 lg:text-[1.75rem]"
          >
            <ArrowLeft className="size-5 lg:size-6" strokeWidth={1.7} aria-hidden />
            <span className="lg:hidden">Профил</span>
            <span className="hidden lg:inline">{CAMPAIGN_TEXT.sectionName}</span>
          </Link>
          <h1 className="mb-4 font-display text-[28px] font-medium leading-tight lg:sr-only">{CAMPAIGN_TEXT.sectionName}</h1>

          {views.length === 0 ? (
            <div className="pt-16 text-center">
              <p className="font-display text-[22px] font-medium text-foreground/80">{CAMPAIGN_TEXT.empty}</p>
              <p className="mx-auto mt-6 rounded-2xl bg-secondary px-6 py-4 text-[17px] leading-snug text-muted-foreground">
                {CAMPAIGN_TEXT.emptyHint}
              </p>
              <div className="mt-8">{newButton}</div>
            </div>
          ) : (
            <>
              {newButton}
              <ul className="space-y-3">
                {views.map((v) => (
                  <PromotionRow key={v.id} v={v} today={today} selected={v.id === selected?.id} />
                ))}
              </ul>
            </>
          )}
        </div>

        {selected && (
          <div className={cn(!chosen && "hidden lg:block", "lg:pt-2")}>
            {chosen && (
              <Link
                href="/staff/promotions"
                className="-ml-1 -mt-3 mb-4 inline-flex h-12 items-center gap-6 px-1 text-[17px] text-foreground transition-colors hover:text-foreground/70 lg:hidden"
              >
                <ArrowLeft className="size-5" strokeWidth={1.7} aria-hidden />
                {CAMPAIGN_TEXT.sectionName}
              </Link>
            )}
            <PromotionPanel v={selected} today={today} />
          </div>
        )}
      </div>
    </StaffShell>
  );
}
