import Link from "next/link";
import { Calendar, Phone } from "lucide-react";
import { formatEuro } from "@/lib/booking/price";
import { longDay } from "@/lib/campaigns/rules";
import { campaignCta, endsLine } from "@/components/campaigns/campaign-card";
import { EndGate } from "@/components/campaigns/end-gate";
import { withFrom, type PublicCampaign } from "@/lib/campaigns/public";
import { cn } from "@/lib/utils";

// Промоциите на страницата на категорията (лента най-горе, кадър кръг-2/категория-1440 и …-390 екр. 1) и на
// страницата на услугата (до цената, кадри услуга-ботокс-1440 и …-390 екр. 2). Цената по промоцията е само в
// текста: Offer на тези страници остава каталожният (Алтаир).

const upright = "[font-feature-settings:'locl'_0,'lnum'_1]";
// Обикновените букви в текст, който не е заглавие (Канопус, част 2, т. 1): Manrope под lang=bg иначе взема БГ формите.
// Курсивът на Cormorant ги пази, затова на редовете, които на 1440 стават курсив, е само до lg (`plainMobile`).
const plain = "[font-feature-settings:'locl'_0]";
const plainMobile = "max-lg:[font-feature-settings:'locl'_0]";

/**
 * Лентата над героя на категорията: по ред на промоция, първо тази, която свършва най-скоро; на 390 само един
 * ред, на 1440 до два (Канопус, част 2, т. 3). «Всички промоции» е веднъж: вдясно на първия ред на 1440, отдолу на
 * 390. Без течаща в категорията лентата я няма.
 */
export function CategoryPromoStrip({ campaigns, slug, today }: { campaigns: PublicCampaign[]; slug: string; today: string }) {
  const rows = campaigns
    .flatMap((c) => c.services.filter((s) => s.categorySlug === slug).map((s) => ({ c, s })))
    .sort((a, b) => a.c.endsOn.localeCompare(b.c.endsOn))
    .slice(0, 2);
  if (rows.length === 0) return null;
  const lastEnd = rows.reduce((m, r) => (r.c.endsOn > m ? r.c.endsOn : m), "");
  const allLabel = campaigns.length > 1 ? `Всички промоции (${campaigns.length})` : "Всички промоции";
  const allCls = cn("font-display text-[17px] text-primary underline underline-offset-4", plain);
  return (
    <EndGate endsOn={lastEnd}>
      <section aria-label="Промоции в тази категория" className="border-b border-border/60 bg-sand">
        <div className="mx-auto max-w-7xl px-4 lg:divide-y lg:divide-border/60 lg:px-10">
          {rows.map(({ c, s }, i) => (
            <EndGate key={`${c.id}-${s.serviceItemId}`} endsOn={c.endsOn}>
              <div className={cn("pt-1 text-center lg:flex lg:items-end lg:gap-10 lg:py-4 lg:text-left", i > 0 && "hidden")}>
                <div className="min-w-0 lg:flex-1">
                  <p className="font-serif text-[30px] italic leading-[0.95] text-primary lg:leading-tight">{c.card.who}</p>
                  <div className="lg:mt-0.5 lg:flex lg:items-baseline lg:gap-3">
                    <p className={cn("font-serif text-[20px] italic leading-tight lg:text-[30px] lg:not-italic", "lg:[font-feature-settings:'locl'_0,'lnum'_1]")}>
                      {s.name}
                    </p>
                    <div className="flex items-center justify-center gap-2.5 lg:flex-1 lg:items-baseline lg:gap-3" aria-hidden>
                      <span className="mb-1 w-6 shrink-0 self-end border-b-2 border-dotted border-muted-foreground/45 lg:min-w-8 lg:flex-1" />
                      {c.kind === "discount" && s.prevEur != null && s.newEur != null ? (
                        <>
                          <s className={cn("shrink-0 whitespace-nowrap font-serif text-[20px] leading-none text-muted-foreground lg:text-[30px]", upright)}>
                            {formatEuro(s.prevEur)}
                          </s>
                          <span className={cn("shrink-0 whitespace-nowrap font-serif-semi text-[34px] font-semibold leading-none text-primary lg:text-[46px]", upright)}>
                            {formatEuro(s.newEur)}
                          </span>
                          {s.percent != null && (
                            <span className={cn("hidden shrink-0 font-serif-semi text-[28px] font-semibold leading-none text-primary lg:inline", upright)}>−{s.percent}%</span>
                          )}
                        </>
                      ) : (
                        <span className={cn("shrink-0 whitespace-nowrap font-serif text-[24px] leading-none lg:text-[34px]", upright)}>
                          {s.regularEur != null ? `${s.priceFrom ? "от " : ""}${formatEuro(s.regularEur)}` : ""}
                        </span>
                      )}
                      <span className={cn("ml-1 min-w-0 text-left font-display text-[13px] leading-tight text-muted-foreground lg:hidden", plain)}>
                        {endsLine(c.endsOn, today)}
                      </span>
                    </div>
                  </div>
                  {c.kind === "gift" && c.card.gift && (
                    <p className={cn("font-display text-[15px] text-muted-foreground lg:font-serif lg:text-[22px] lg:italic", plainMobile)}>Подарък в същия час: {c.card.gift}</p>
                  )}
                  <p className="sr-only">{promoTextLine(c, s)}</p>
                </div>
                <div className="hidden lg:flex lg:shrink-0 lg:flex-col lg:items-end lg:gap-3 lg:pb-1">
                  <p className={cn("font-display text-[16px] text-muted-foreground", plain)}>{endsLine(c.endsOn, today)}</p>
                  {i === 0 && (
                    <Link href="/promotsii?from=kategoriya" className={cn("inline-flex min-h-11 items-center", allCls)}>
                      {allLabel}
                    </Link>
                  )}
                </div>
              </div>
            </EndGate>
          ))}
        </div>
        <div className="px-4 pb-1 text-center lg:hidden">
          <Link href="/promotsii?from=kategoriya" className={cn("inline-flex min-h-6 items-center leading-none", allCls)}>
            {allLabel}
          </Link>
        </div>
      </section>
    </EndGate>
  );
}

/** Видимият за Google и за четците ред (Саиф 2.17): с думите «нова цена» и «предишна цена», не «вместо». */
function promoTextLine(c: PublicCampaign, s: PublicCampaign["services"][number]) {
  const until = `Промоция до ${longDay(c.endsOn)} ${c.card.who}`;
  return c.kind === "discount" && s.newEur != null && s.prevEur != null
    ? `${until}: нова цена ${formatEuro(s.newEur)}, предишна цена ${formatEuro(s.prevEur)}.`
    : `${until}: подарък в същия час: ${c.card.gift ?? ""}.`;
}

/** Блокът до цената на услугата: по ред на специалист, с бутона към записа (или обаждане). */
export function ServicePromo({ campaigns, serviceName, today }: { campaigns: PublicCampaign[]; serviceName: string; today: string }) {
  const rows = campaigns.flatMap((c) => c.services.filter((s) => s.name === serviceName).map((s) => ({ c, s })));
  if (rows.length === 0) return null;
  return (
    <div className="mt-6 space-y-10 text-center lg:mt-4 lg:text-left">
      {rows.map(({ c, s }) => {
        const cta = campaignCta({ ...c.card, services: [c.card.services.find((x) => x.name === s.name) ?? c.card.services[0]] }, c.action.phone);
        const Icon = c.action.phone ? Phone : Calendar;
        const btn =
          "mt-6 inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-full bg-foreground px-8 font-display text-[17px] font-semibold text-background transition-colors hover:bg-primary [font-feature-settings:'locl'_0] lg:mt-7 lg:h-[50px] lg:w-auto lg:text-[18px]";
        return (
          <EndGate key={`${c.id}-${s.serviceItemId}`} endsOn={c.endsOn}>
            <section aria-label="Промоция за тази услуга" className="lg:max-w-[600px]">
              <p className="font-serif text-[40px] italic leading-tight text-primary lg:text-[51px] lg:leading-[1.05]">{c.card.who}</p>
              <div className="mt-1 lg:flex lg:items-baseline lg:gap-3">
                <p className={cn("font-serif text-[44px] leading-tight lg:font-serif-semi lg:text-[40px] lg:font-semibold", upright)}>Промоция</p>
                <span className="mb-2.5 hidden min-w-8 flex-1 self-end border-b-2 border-dotted border-muted-foreground/45 lg:block" aria-hidden />
                <div className="mt-2 flex items-baseline justify-center gap-3 lg:mt-0" aria-hidden>
                  {c.kind === "discount" && s.prevEur != null && s.newEur != null ? (
                    <>
                      <s className={cn("font-serif text-[30px] leading-none text-muted-foreground lg:text-[43px]", upright)}>{formatEuro(s.prevEur)}</s>
                      <span className={cn("font-serif-semi text-[48px] font-semibold leading-none text-primary lg:text-[62px]", upright)}>{formatEuro(s.newEur)}</span>
                      {s.percent != null && (
                        <span className={cn("font-serif-semi text-[28px] font-semibold leading-none text-primary lg:hidden", upright)}>−{s.percent}%</span>
                      )}
                    </>
                  ) : (
                    <span className={cn("font-serif text-[36px] leading-none lg:text-[56px]", upright)}>
                      {s.regularEur != null ? `${s.priceFrom ? "от " : ""}${formatEuro(s.regularEur)}` : ""}
                    </span>
                  )}
                </div>
              </div>
              {c.kind === "discount" && s.percent != null && (
                <p className={cn("hidden pr-4 text-right font-serif-semi text-[47px] font-semibold leading-none text-primary lg:block", upright)} aria-hidden>
                  −{s.percent}%
                </p>
              )}
              <p className="sr-only">{promoTextLine(c, s)}</p>
              {c.kind === "gift" && c.card.gift && (
                <p className={cn("mt-3 font-display text-[17px] lg:font-serif lg:text-[30px] lg:italic lg:text-muted-foreground", plainMobile)}>Подарък в същия час: {c.card.gift}</p>
              )}
              <div className={cn("mt-3 space-y-0.5 font-display text-[17px] leading-snug text-foreground/80 lg:mt-0 lg:font-serif lg:text-[26px] lg:italic lg:text-muted-foreground", plainMobile)}>
                {c.card.firstVisitOnly && <p>Само за първо посещение при {c.card.sameWho}.</p>}
                {c.card.slotsLeft != null && <p>{c.card.slotsLeft === 1 ? "Остава 1 място." : `Остават ${c.card.slotsLeft} места.`}</p>}
                <p>{endsLine(c.endsOn, today)}</p>
              </div>
              {c.action.phone ? (
                <a href={c.action.href} aria-label={cta.label} className={btn}>
                  <Icon className="size-5" aria-hidden /> {cta.text}
                </a>
              ) : (
                <Link href={withFrom(c.action.href, "usluga")} aria-label={cta.label} className={btn}>
                  <Icon className="size-5 lg:hidden" aria-hidden /> {cta.text}
                </Link>
              )}
            </section>
          </EndGate>
        );
      })}
    </div>
  );
}
