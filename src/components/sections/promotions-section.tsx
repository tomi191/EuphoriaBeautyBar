import Link from "next/link";
import { CampaignCard } from "@/components/campaigns/campaign-card";
import { PromoTitle } from "@/components/campaigns/promo-title";
import { EndGate } from "@/components/campaigns/end-gate";
import { homePicks, loadRunningCampaigns, withFrom } from "@/lib/campaigns/public";
import { todaySofia } from "@/lib/campaigns/core";

/**
 * Секцията «Промоции в салона.» на началната (визия №26, A-начална-1440/390), веднага след първия екран.
 * По една карта на специалист, най-много 2 (кадрите A-начална), първо тези, които свършват най-скоро; без течаща промоция я няма.
 */
export async function PromotionsSection() {
  let all: Awaited<ReturnType<typeof loadRunningCampaigns>> = [];
  try {
    all = await loadRunningCampaigns();
  } catch (e) {
    // Без база на сглобката или при грешка началната остава без секцията, не пада.
    console.error("[promotions] началната не прочете промоциите:", e);
    return null;
  }
  if (all.length === 0) return null;
  const picks = homePicks(all);
  const today = todaySofia();
  const lastEnd = picks.reduce((m, c) => (c.endsOn > m ? c.endsOn : m), "");
  return (
    <EndGate endsOn={lastEnd}>
      <section id="promotsii" aria-labelledby="promotsii-title" className="bg-background py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 lg:px-10">
          <PromoTitle id="promotsii-title" aside="Цената важи и когато запазваш онлайн." />
          <div className="mt-10 grid gap-y-10 lg:mt-16 lg:grid-cols-2 lg:gap-y-16 lg:[&>*:nth-child(even)]:border-l lg:[&>*:nth-child(even)]:border-border lg:[&>*:nth-child(even)]:pl-11 lg:[&>*:nth-child(odd)]:pr-11">
            {picks.map((c) => (
              <EndGate key={c.id} endsOn={c.endsOn}>
                <div>
                  <CampaignCard variant="menu" data={c.card} today={today} href={withFrom(c.action.href, "nachalna")} phone={c.action.phone} />
                </div>
              </EndGate>
            ))}
          </div>
          {all.length > picks.length && (
            <Link href="/promotsii" className="mt-10 inline-flex min-h-12 items-center font-serif text-[24px] italic text-primary underline underline-offset-4">
              Всички промоции ({all.length})
            </Link>
          )}
        </div>
      </section>
    </EndGate>
  );
}
