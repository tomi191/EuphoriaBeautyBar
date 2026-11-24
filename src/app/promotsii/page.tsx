import type { Metadata } from "next";
import Link from "next/link";
import { CampaignCard } from "@/components/campaigns/campaign-card";
import { PromoTitle } from "@/components/campaigns/promo-title";
import { EndGate } from "@/components/campaigns/end-gate";
import { JsonLd } from "@/components/seo/json-ld";
import { byPosition, campaignOffersLd, loadEndedCampaign, loadRunningCampaigns } from "@/lib/campaigns/public";
import { todaySofia } from "@/lib/campaigns/core";
import { longDay } from "@/lib/campaigns/rules";
import { formatEuro } from "@/lib/booking/price";
import { cn } from "@/lib/utils";

// Промоциите (№11, част 2; кадри кръг-2/промоции-390 и промоции-1440). Винаги жива: промоцията тръгва и свършва
// по дата, а без течаща страницата е noindex и излиза от sitemap (Алтаир). Стара връзка (?id= от пост) към
// свършила промоция казва «приключи на …» с редовната цена, никога 404.
export const dynamic = "force-dynamic";

const INTRO = "Всяка промоция има услуга, специалист, цена преди и сега и дата, до която важи. Цената остава записана в часа, който запазиш.";

export async function generateMetadata(): Promise<Metadata> {
  const running = await loadRunningCampaigns().catch(() => []);
  return {
    title: "Промоции в салона, кв. Левски, Варна",
    description:
      "Промоции в Euphoria Hair & Beauty Bar, кв. Левски, Варна: услуга, цена преди и сега, дата на края и условия. Запиши час онлайн.",
    alternates: { canonical: "/promotsii" },
    robots: running.length > 0 ? undefined : { index: false, follow: true },
    openGraph: {
      type: "website",
      url: "/promotsii",
      title: "Промоции в Euphoria, кв. Левски, Варна",
      description: "Цена преди и сега, дата на края и условията. Запиши час онлайн.",
    },
  };
}

const primaryBtn =
  "inline-flex h-12 w-full items-center justify-center rounded-full bg-foreground px-8 font-display text-[17px] font-semibold text-background transition-colors hover:bg-foreground/85 lg:h-[53px] lg:w-auto lg:min-w-[312px] lg:text-[19px]";
const secondLink = "inline-flex min-h-12 items-center font-serif text-[30px] italic text-primary underline underline-offset-4";

export default async function PromotionsPage({ searchParams }: { searchParams: Promise<{ id?: string | string[] }> }) {
  const { id: rawId } = await searchParams;
  const id = typeof rawId === "string" ? rawId.slice(0, 64) : null;
  const [running, ended] = await Promise.all([loadRunningCampaigns(), id ? loadEndedCampaign(id) : Promise.resolve(null)]);
  const today = todaySofia();

  if (ended) {
    return (
      <section className="bg-background pt-10 pb-20 lg:pt-20 lg:pb-28">
        <div className="mx-auto max-w-2xl px-4 lg:px-10">
          <h1 className="font-display text-[30px] leading-tight font-medium [text-wrap:pretty] lg:text-5xl">
            Тази промоция приключи на {longDay(ended.endedOn, today)}.
          </h1>
          {ended.regular && (
            <p className="mt-6 font-display text-[19px] leading-snug text-muted-foreground lg:text-[22px]">
              {ended.serviceName}: редовната цена е {ended.regular.from ? "от " : ""}
              {formatEuro(ended.regular.eur)}.
            </p>
          )}
          <div className="mt-8">
            <Link href={ended.serviceHref} className={primaryBtn}>
              Виж услугата
            </Link>
          </div>
          <div className="mt-8 border-t border-border pt-8 text-center lg:text-left">
            <Link href="/zapazi-chas" className={secondLink}>
              Запиши час
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const groups = byPosition(running);
  const items = groups.flatMap((g) => g.items.map((c, i) => ({ c, heading: g.heading, first: i === 0 })));

  return (
    <section className="bg-background pt-10 pb-20 lg:pt-16 lg:pb-28">
      <div className="mx-auto max-w-7xl px-4 lg:px-10">
        <PromoTitle as="h1" aside={INTRO} />

        {items.length === 0 ? (
          <div className="mt-14 max-w-xl lg:mt-20">
            <h2 className="font-display text-[30px] leading-tight font-medium lg:text-4xl">Сега няма промоции.</h2>
            <p className="mt-6 font-display text-[19px] leading-snug text-muted-foreground lg:text-[22px]">
              Цените са в ценоразписа, а свободните часове в записването.
            </p>
            <div className="mt-8">
              <Link href="/uslugi" className={primaryBtn}>
                Виж ценоразписа
              </Link>
            </div>
            <div className="mt-6 text-center lg:text-left">
              <Link href="/zapazi-chas" className={secondLink}>
                Запиши час
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-10 grid gap-y-8 lg:mt-14 lg:grid-cols-2 lg:gap-y-16 lg:[&>*:nth-child(even)]:border-l lg:[&>*:nth-child(even)]:border-border lg:[&>*:nth-child(even)]:pl-16 lg:[&>*:nth-child(odd)]:pr-16">
            {items.map(({ c, heading, first }) => (
              <EndGate key={c.id} endsOn={c.endsOn}>
                <div className={cn(!first && "border-t border-border pt-6 lg:border-t-0 lg:pt-0", first && items[0].c.id !== c.id && "mt-4 lg:mt-0")}>
                  <h2
                    className={cn(
                      "border-b border-border pb-1.5 font-display text-[26px] leading-tight font-medium lg:max-w-[440px] lg:font-serif-semi lg:text-[36px] lg:font-semibold",
                      !first && "hidden lg:block",
                    )}
                  >
                    {heading}
                  </h2>
                  <CampaignCard
                    variant="menu"
                    data={c.card}
                    today={today}
                    href={c.action.href}
                    phone={c.action.phone}
                    className={cn("mt-3", !first && "mt-0 lg:mt-3")}
                  />
                </div>
              </EndGate>
            ))}
          </div>
        )}
      </div>
      {running.length > 0 && <JsonLd data={campaignOffersLd(running)} />}
    </section>
  );
}
